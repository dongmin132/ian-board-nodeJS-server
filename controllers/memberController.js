import fs from 'fs';
import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import multer from 'multer';
// import { dirname }from 'path';
import { fileURLToPath } from 'url';
import { members } from '../models/members.js'
import path from 'path'; // path 모듈 import


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//세션 및 쿠키 설정
app.use(cookieParser());


// 세션 설정
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

// multer 설정
const storage = multer.diskStorage({
    destination: 'img/',
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});
const upload = multer({ storage: storage });


// 현재 URL을 전부 보여줌
const __filename = fileURLToPath(import.meta.url);
// 현재 디렉터리 경로 까지만 보여줌
const __dirname = path.dirname(__filename);


//-----------------------------------------비즈니스 로직
const loginCheck = (email, password) => {
    return members.find(member => member.email === email && member.password === password);
}
const findById= (memberId) => {
    return members.find(member => memberId === member.id);
}

const memberRegister = (imagePath, data) => {
    const memberId = members[members.length - 1].id + 1;  //id는 거의 1부터 오름차순으로 올라가기에 members에 가장 마지막 값에서 1을 더해주었다.
    const member = {
        id: memberId,
        email: data.email, // FormData에서 email 필드 추출
        password: data.password, // FormData에서 password 필드 추출
        nickname: data.nickname, // FormData에서 nickname 필드 추출
        profile_image: imagePath
    };
    //   console.log(members);
    return member;
}

const emailValidCheck = (email) => {
    if (members.find(member => member.email === email)) {
        // console.log(members);
        return true;
    }
    // console.log(email);
    return false;
}

const nicknameValidCheck = (nickname) => {
    if(members.find(member => nickname===member.nickname)){
        return true;
    }

    return false;
}

const imgDelete = (imagePath) => {
    fs.unlink('.'+imagePath, (err) => {
        if(err) {
            console.error('Error deleting image file: ', err);
        } else {
            console.log("이미지가 성공적으로 지워짐: ", imagePath);
        }
    });
}

const memberDataFile = (memberJsonFile) => {
    // memberFile을 JSON.stringify()를 사용하여 JSON 문자열로 변환

    // JSON 문자열을 members.json 파일에 쓰기
    fs.writeFile('./models/members.js', 'export const members =' + memberJsonFile, (err) => {
        if (err) {
            console.error('Error writing JSON file:', err);
        } else {
            console.log('JSON file has been saved.');
        }
    });
};

//--------------------------------------------------------

export const login = (req, res) => {
    const { email, password } = req.body;

    const member = loginCheck(email, password);

    if (member) {
        res.cookie('userId', member.id, { maxAge: 900000000, path: '/' });

        res.status(200).json({ message: 'login_success', data: member });
    } else {
        res.status(401).json({ message: 'Authenthication_err' })
    }
}

export const register = (req, res) => {
    // console.log(req.body);
    upload.single('profileImage')(req, res, function (err) {
        const imagePath = '/' + req.file.path;
        if (err instanceof multer.MulterError) {
            // 업로드 오류 처리
            res.status(500).json({ message: 'upload_error' });
            return;
        }

        if(!req.body.email || !req.body.password || !req.body.nickname || !req.file) {
            imgDelete(imagePath)
            res.status(400).json({message:'빈칸이 존재'});
            return;
        }
        // if(emailValidCheck(req.body.email)) {
        //     imgDelete(imagePath);
        //     res.status(400).json({message: 'Invalid_email'});
        //     return ;
        // }

        // 파일 업로드가 성공하면 여기에 도달한다.
        // req.file을 통해 업로드된 파일에 대한 정보에 접근할 수 있다.
        if (!emailValidCheck(req.body.email)) {
            //이미지 경로명 추출
            
            // 업로드된 파일의 경로에서 확장자 추출
            // const extname = path.extname(req.file.originalname);

            //members에 멤버를 추가해줌.
            members.push(memberRegister(imagePath, req.body));
            //추가한 멤버를 JSON형식의 문자열로 변환해 member.js에 넣어줌(디비 역할)
            // console.log("여기서 값을 확인을 한번 해보자: ",members);
            memberDataFile(JSON.stringify(members));

            res.status(201).json({ status:201, message: 'regiseter_success' });
        }
        
    })
}

export const getMember = (req,res) => {
    const memberId=req.params.memberId;
    
    const memberIndex=members.findIndex(member=> member.id === parseInt(memberId));
    res.json(members[memberIndex]);
}

export const memberUpdate = (req,res) => {
    const memberId =req.params.memberId;
    //  멤버에 인덱스를 찾는 함수
    const memberIndex = members.findIndex(member=> member.id == parseInt(memberId))
    if(memberIndex==-1) {
        res.status(404).json({message:'member not found'})
        return;
    }
    if(nicknameValidCheck(req.body.nickname)) {
        res.status(400).json({status:400,message:"invalid_user_id"})
        return ;
    }
    
    
    members[memberIndex]={...members[memberIndex],...req.body}
    memberDataFile(JSON.stringify(members))
    res.status(200).json({status:200,message:"updata_member_success"})
    
        
    
}

export const checkEmail = (req,res) => {

    const email = emailValidCheck(req.body.email)
    if(email) {
        res.status(400).json({status:400,message:'already_exist_email'})
    }
    else  {
        res.status(200).json({status:200,message:'email_success'})
    }
}

export const checkNickname = (req,res) => {
    const nickname = nicknameValidCheck(req.body.nickname)
    if(nickname) {
        res.status(400).json({status:400,message:'already_exist_nickname'})
    }
    else {
        res.status(200).json({status:200,message:'nickname_success'});
    }
}
