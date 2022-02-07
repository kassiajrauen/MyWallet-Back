import express, {json} from 'express';
import { MongoClient } from "mongodb";
import cors from 'cors';
import dotenv from "dotenv";
import bcrypt from 'bcrypt';
import { v4 as uuid } from "uuid";

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
	db = mongoClient.db("projeto_13_MyWallet");
});

const server = express();
server.use(json());
server.use(cors());

server.post("/login", async (req, res) => {
	const user = req.body;

	const loginSchema = joi.object({
		email: joi.string().email().required(),
		password: joi.string().required()
	});

	const validate = loginSchema.validate(user);

	if(validate.error){
		return res.sendStatus(422);
	}

	try{await db.collection("users").findOne(user);
		if(user && bcrypt.compareSync(user, user.password)){
			const token = uuid();

			await db.collection("sessions").insertOne({token: token, userId: user._id, email: user.email});

			res.sendStatus({token: token, name: user.name});
		}else{
			res.sendStatus(401);
		}
	}
	catch(error) {
		res.sendStatus(500);
	};
})

server.post("/sign-up", async (req, res) => {
	const user = req.body;
	
	user.password = bcrypt.hashSync(req.body.password, 10);
	
	const userSchema = join.object({
		name: join.string().required(),
		email: join.string().email().required(),
		password: join.string().required(),
		confirmPassword: join.string().required()
	});

	const validate = userSchema.validate(user);

	if(validate.error){
		return res.sendStatus(422);
	}


	await db.collection("users").findOne({name: user.name, email: user.email, password: user.password, confirmPassword: user.confirmPassword}).then((exist) => {
		if(exist){
			res.sendStatus(409)
			return;
		}
	}).catch((err) => {
		res.sendStatus(500);
	});

	await db.collection("users").insertOne(
		{name: user.name, email: user.email, password: user.password, confirmPassword: user.confirmPassword});

	res.sendStatus(201);	
})

server.post("/new-entry", async (req, res) => {
	const newEntry = req.body;

	await db.collection("historic").insertOne({type: "new-entry", value: newEntry.value, description: newEntry.description, date: Date.now()});

	res.sendStatus(201);
})

server.post("/new-exit", async (req, res) => {
	const newExit = req.body;

	await db.collection("historic").insertOne({type: "new-exit", value: newExit.value, description: newExit.description, date: Date.now()});

	res.sendStatus(201);
})

server.get("/home", async (req, res) => {

	await db.collection("historic").find({}).toArray().then(historic => {
		res.send(historic)
	});


	res.sendStatus(200);
})

server.listen(5000);
