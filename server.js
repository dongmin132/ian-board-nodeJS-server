import express from 'express';
import memberRouter from './routes/member.js'
import boardRouter from './routes/board.js'
import session from 'express-session';
import mysqlSession from 'express-mysql-session';
import cors from 'cors';

const server = express();
server.use(express.json());
server.use(express.urlencoded({ extended: true }));

const MySQLStore = mysqlSession(session);
server.use(cors({
    origin: 'http://localhost:3000',
    credentials: true, // 사용자 인증이 필요한 리소스(쿠키 ..등) 접근
    methods: ['GET','PUT','POST','PATCH','DELETE']
}));


const options = {
    host: 'localhost',
    port: '3306',
    user:'root',
    password:'',
    database:'community_db'
}

const sessionStore = new MySQLStore(options);

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
    store: sessionStore
}))  


server.use('/img',express.static('img'));   // /img 경로로 접근할때 img디렉토리의 파일이 제공


server.use('/members',memberRouter);
server.use('/boards',boardRouter);

const port = 3001;

server.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });