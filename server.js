import express from 'express';
import memberRouter from './routes/member.js'
import boardRouter from './routes/board.js'
import session from 'express-session';
import MemoryStoreModule from 'memorystore';
import cors from 'cors';

const server = express();
server.use(express.json());
server.use(express.urlencoded({ extended: true }));

const MemoryStore=MemoryStoreModule(session);
server.use(cors({
    origin: 'http://localhost:3000',
    credentials: true, // 사용자 인증이 필요한 리소스(쿠키 ..등) 접근
    methods: ['GET','PUT','POST','PATCH','DELETE']
}));


// 세션 설정
server.use(session({
    resave:true,
    saveUninitialized:false,
    secret:'secret',
    name:'sessionId',
    cookie:{
        httpOnly:true,
        path:"/"
    }
}))  


server.use('/img',express.static('img'));   // /img 경로로 접근할때 img디렉토리의 파일이 제공


server.use('/members',memberRouter);
server.use('/boards',boardRouter);

const port = 3001;

server.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });