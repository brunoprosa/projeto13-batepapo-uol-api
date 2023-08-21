import express from "express";
import cors from "cors"
import { MongoClient } from "mongodb";
import dotenv from "dotenv"
import dayjs from "dayjs";
import joi from "joi";

const app = express();
app.use(express.json());
app.use(cors);
dotenv.config()

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

mongoClient.connect()
	.then(() => db = mongoClient.db())
	.catch((err) => console.log(err.message))

app.post("/participants", async (req, res) => {
    const {name} = req.body
    const userSchema = joi.object({
        name: joi.string().required()
    })
    const validation = userSchema.validate(req.body, { abortEarly: false });
    if (validation.error) {
        const errors = validation.error.details.map((detail) => detail.message);
        return res.status(422).send(errors);
    }
    try{
    const exist = await db.collection("participants").find(name).toArray()
    if (exist.length === 1) return res.status(409).send("nome já existente!")
    await db.collection("participants").insertOne({
        name,
        lastStatus: Date.now()
    })
    const time = dayjs().format("HH:mm:ss")
    await db.collection("messages").insertOne({ 
		from: name,
		to: 'Todos',
		text: 'entra na sala...',
		type: 'status',
		time
    })
    res.status(201)
    } catch (err){
        return res.status(500).send(err.message);
    }
});
app.get("/participants", (req, res) => {
    db.collection("participants").find().toArray()
    .then(participants => res.send(participants))
    .catch(err => res.status(500).send(err.message))
})
app.post("/messages", async (req, res) => {
    const from = req.headers.user
    const {to, text, type} = req.body
    const userSchema = joi.object({
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().required(),
    })
    const isCorrect = type === "message" || type === "private_message"
    const validation = userSchema.validate(req.body, { abortEarly: false });
    if (validation.error || !isCorrect) {
        return res.status(422)
    }
    try{
        const exist = await db.collection("participants").find(from).toArray()
        if(exist.length === 0) return res.status(422).send("remetente inexistente!")
        const time = dayjs().format("HH:mm:ss")
        await db.collection("messages").insertOne({
            from, to, text, type, time
        })
        res.status(201)
    } catch(err){
        return res.status(500).send(err.message);
    }
})

const PORT = 5000
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`))