import express, {json} from 'express';
import { MongoClient } from "mongodb";
import cors from 'cors';
import dotenv from "dotenv";

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

	{await db.collection("users").findOne({email: user.email, password: user.password}).then((exist) => {
		if(!exist){
			res.sendStatus(401)
			return;
		}
	})
	.catch(() => {
		res.sendStatus(500)
	})};

	res.sendStatus(200);
})

server.post("/sign-up", async (req, res) => {
	const user = req.body;

	{await db.collection("users").findOne({name: user.name, email: user.email, password: user.password, confirmPassword: user.confirmPassword}).then((exist) => {
		if(exist){
			res.sendStatus(409)
			return;
		}
	}).catch((err) => {
		res.sendStatus(500);
	});

	await db.collection("users").insertOne(
		{name: user.name, email: user.email, password: user.password, confirmPassword: user.confirmPassword});

	res.sendStatus(201);}
	
})

server.listen(5000);
