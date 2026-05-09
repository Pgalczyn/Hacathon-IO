import express, {Request,Response} from "express";

const app = express();
app.use(express.json());

const PORT= 3000;

app.get('/', (req: Request, res: Response) => {
    res.send('Hello TypeScript Express!');
});


app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});
