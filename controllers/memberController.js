import fs from 'fs';
import express from 'express';
import cookieParser from 'cookie-parser';
// import session from 'express-session';
import multer from 'multer';
// import { dirname }from 'path';
import { members } from '../models/members.js'
import path from 'path'; // path 모듈 import


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//세션 및 쿠키 설정
app.use(cookieParser());




// multer 설정
//stoarge multer.memoryStorage에 저장했다가 유효성 검사가 통과하면 그때 저장하는 방식도 있는데 좀 더 생각해보고 적용해보자
const storage = multer.diskStorage({
    destination: 'img/',        //파일이 저장될 폴더
    limits: { fileSize: 5 * 1024 * 1024 },      //파일 사이즈는 5MB
    filename: function (req, file, cb) {        //destination에 저장된 파일명a
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});
const upload = multer({ storage: storage });



//-----------------------------------------비즈니스 로직
const loginCheck = (email, password) => {
    return members.find(member => member.email === email && member.password === password);
}
const findById = (memberId) => {
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
    if (members.find(member => nickname === member.nickname)) {
        return true;
    }

    return false;
}

const imgDelete = (imagePath) => {
    if (fs.existsSync('.' + imagePath)) {
        fs.unlink('.' + imagePath, (err) => {
            if (err) {
                console.log('Error deleting image file: ', err);
            } else {
                console.log("이미지가 성공적으로 지워짐: ", imagePath);
            }
        })
    } else {
        console.log("파일이 없음");
    }
}

const memberSaveFile = (memberJsonFile) => {
    // memberFile을 JSON.stringify()를 사용하여 JSON 문자열로 변환

    // JSON 문자열을 members.json 파일에 쓰기
    const memberJson = JSON.stringify(memberJsonFile, null, 2);
    fs.writeFile('./models/members.js', 'export const members =' + memberJson, (err) => {
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
        req.session.userId = member.id;
        console.log(req.session);

        res.status(200).json({ message: 'login_success', data: member });
    } else {
        res.status(401).json({ message: 'Authenthication_err' })
    }
}

export const register = (req, res) => {
    
    
    upload.single('profileImage')(req, res, function (err) {
        
        const imagePath = '/' + req.file.path;
        console.log(imagePath);
        if (err instanceof multer.MulterError) {
            // 업로드 오류 처리
            res.status(500).json({ message: 'upload_error' });
            return;
        }

        if (!req.body.email || !req.body.password || !req.body.nickname || !req.file) {
            imgDelete(imagePath)
            res.status(400).json({ message: '빈칸이 존재' });
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
            memberSaveFile(members);

            res.status(201).json({ status: 201, message: 'regiseter_success' });
        }

    })
}

export const getMember = (req, res) => {
    
    const memberId = req.userId
    const memberIndex = members.findIndex(member => member.id === memberId);
    console.log("memberID:",memberId);
    res.json(members[memberIndex]);
}

export const memberUpdate = (req, res) => {
    upload.single('profileImage')(req, res, function (err) {
        const memberId = req.params.memberId;
        //  멤버에 인덱스를 찾는 함수
        const memberIndex = members.findIndex(member => member.id == parseInt(memberId))
        if (memberIndex == -1) {
            res.status(404).json({ message: 'member not found' })
            return;
        }

        if (err instanceof multer.MulterError) {
            // 업로드 오류 처리
            res.status(500).json({ message: 'upload_error' });
            return;
        }
        if (nicknameValidCheck(req.body.nickname)) {
            res.status(400).json({ status: 400, message: "invalid_user_id" })
            return;
        }
        if (req.file !== undefined) {
            const imagePath = '/' + req.file.path;

            imgDelete(members[memberIndex].profile_image);
            // members[memberIndex] = { ...members[memberIndex], ...req.body }      //받아온 json형 객체를 한번에 붙여준다!
            members[memberIndex].nickname = req.body.nickname;
            members[memberIndex].profile_image = imagePath;

            memberSaveFile(members)
            res.status(200).json({ status: 200, message: "updata_member_success" })
        }
        else {
            members[memberIndex].nickname = req.body.nickname;

            memberSaveFile(members)
            res.status(200).json({ status: 200, message: "update_nickname_success" })
        }
    })
}

export const memberPassword = (req, res) => {
    console.log(req.session);
    const memberId = parseInt(req.params.memberId)
    const index = members.findIndex(member => memberId === member.id)
    members[index].password = req.body.password;
    console.log(req.body);
    memberSaveFile(members);
    if (memberId === null) {
        res.status(401).json({ status: 401, message: "Unauthorization" })
    } else if (index === -1) {
        res.status(404).json({ status: 404, message: "member_not_found" })
    } else if (index + 1) {     //인덱스가 0부터 시작하므로 0값도 참으로 받을수있게 설정
        res.status(200).json({ status: 200, message: "password_update_success" })
    } else {
        res.status(500).json({ message: 'err' });
    }
}

export const memberDelete = (req, res) => {
    const memberId = parseInt(req.params.memberId);
    console.log(memberId);
    const index = members.findIndex(member => memberId === member.id);
    if (memberId === null)
        res.status(401).json({ status: 401, message: "Unauthorization" })

    else if (index === -1)
        res.status(404).json({ status: 404, message: "Member not found" });

    else {//통과하는 부분
        members.splice(index, 1)
        res.cookie('userId', memberId, { maxAge: 0, path: '/' });
        res.status(200).json({ status: 200, message: "Member delete success!" })

        memberSaveFile(members);

    }
}

export const logout = (req,res) => {
    req.session.destroy(error => {
        if (error) {
                return res.status(500).json({
                status: 500,
                message: '로그아웃 중 문제가 발생했습니다.',
            });
        }
        res.clearCookie('sessionId');
        return res.status(200).json({
            status: 200,
            message: '성공적으로 로그아웃되었습니다.',
        });
    });
}


export const checkEmail = (req, res) => {
    console.log(JSON.stringify(req.session))
    const email = emailValidCheck(req.body.email)
    if (email) {
        res.status(400).json({ status: 400, message: 'already_exist_email' })
    }
    else {
        res.status(200).json({ status: 200, message: 'email_success' })
    }
}

export const checkNickname = (req, res) => {
    const nickname = nicknameValidCheck(req.body.nickname)
    if (nickname) {
        res.status(400).json({ status: 400, message: 'already_exist_nickname' })
    }
    else {
        res.status(200).json({ status: 200, message: 'nickname_success' });
    }
}

