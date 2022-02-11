import express, {json} from 'express';
import { MongoClient } from "mongodb";
import cors from 'cors';
import dotenv from "dotenv";
import bcrypt from 'bcrypt';
import { v4 as uuid } from "uuid";
import joi from 'joi';

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
	db = mongoClient.db("project_13_MyWallet");
});

const server = express();
server.use(json());
server.use(cors());

server.post("/login", async (req, res) => {
	const {email, password} = req.body;

	const loginSchema = joi.object({
		email: joi.string().email().required(),
		password: joi.string().required()
	});

	const validate = loginSchema.validate({email, password});

	if(validate.error){
		return res.sendStatus(422);
	}

	try{
		const user = await db.collection("users").findOne({email});
		if(!user){
			res.sendStatus(401);
			return;
		}

		const isAuthorized = bcrypt.compareSync(password, user.password);
		if(isAuthorized){
			const token = uuid();

			await db.collection("sessions").insertOne({token, userId: user._id,})

			return res.send(token);
		}else{
			res.sendStatus(401);
		};
	}
	catch(error) {
		res.sendStatus(500);
	};
})

server.post("/sign-up", async (req, res) => {
	const user = req.body;
	
	const userSchema = joi.object({
		name: joi.string().required(),
		email: joi.string().email().required(),
		password: joi.string().required(),
		// confirmPassword: joi.string().required()
	});

	const validate = userSchema.validate(user);

	if(validate.error){
		return res.sendStatus(422);
	}else res.sendStatus(201);

	try{
		const passwordHashed = bcrypt.hashSync(user.password, 10);

	const exist = await db.collection("users").findOne(user);
		if(exist){
			res.sendStatus(409)
			return;
		}
	
	await db.collection("users").insertOne(
		{...user, password: passwordHashed});

	res.sendStatus(201);
	} catch(error) {
		res.sendStatus(500);
	}
})

server.post("/new-entry", async (req, res) => {
	const newEntry = req.body;

	const authorization = req.headers.authorization;
	const token = authorization?.replace('Bearer ', '');

	if(!token){
		return res.sendStatus(401);
	}

	const session = await db.collection("sessions").findOne({token});
	if(!session){
		return res.sendStatus(401);
	}

	await db.collection("historic").insertOne({type: "new-entry", value: newEntry.value, description: newEntry.description, date: Date.now()});

	res.sendStatus(201);
})

server.post("/new-exit", async (req, res) => {
	const newExit = req.body;

	const authorization = req.headers.authorization;
	const token = authorization?.replace('Bearer ', '');

	if(!token){
		return res.sendStatus(401);
	}

	const session = await db.collection("sessions").findOne({token});
	if(!session){
		return res.sendStatus(401);
	}

	await db.collection("historic").insertOne({type: "new-exit", value: newExit.value, description: newExit.description, date: Date.now()});

	res.sendStatus(201);
})

server.get("/home", async (req, res) => {

	const authorization = req.headers.authorization;
	const token = authorization?.replace('Bearer ', '');

	if(!token){
		return res.sendStatus(401);
	}

	const session = await db.collection("sessions").findOne({token});
	if(!session){
		return res.sendStatus(401);
	}

	await db.collection("historic").find({}).toArray().then(historic => {
		res.send(historic)
	});


	res.sendStatus(200);
})

server.listen(process.env.PORT, () => {
    console.log("Server running on port " + process.env.PORT);
});
