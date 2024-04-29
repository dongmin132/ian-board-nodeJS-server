import express from 'express';
import memberRouter from './routes/member.js'
import boardRouter from './routes/board.js'
import session from 'express-session';
import MemoryStoreModule from 'memorystore';

import http from 'http';
import cors from 'cors';



const server = express();

// server.options('*', cors()) // include before other routes
// server.use((req,res,next)=> {
//     res.setHeader("Access-Control-Allow-Methods", "GET, PUT, DELETE, POST, PATCH")
//   next()
// })

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
    },
    store: new MemoryStore({checkPeriod:864000000})
}))


// server.use(cors({
//     "origin": "http://localhost:3000",
//     "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
//     "credentials": "true", // 사용자 인증이 필요한 리소스(쿠키 ..등) 접근
//   }));
  

server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use('/img',express.static('img'));   // /img 경로로 접근할때 img디렉토리의 파일이 제공됨.



// 모든 요청에 대한 응답 헤더를 설정합니다.
server.use('/members',memberRouter);
server.use('/boards',boardRouter);

const port = 3001;

server.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });