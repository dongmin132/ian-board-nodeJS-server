import fs from 'fs';
import express from 'express';
import cookieParser from 'cookie-parser';
// import session from 'express-session';
import multer from 'multer';
// import { dirname }from 'path';
import { members } from '../models/members.js'
import { boards } from '../models/boards.js'
import { comments } from '../models/comments.js'
import { memberSaveFile } from '../config/MemberSaveFile.js';
import { boardSaveFile } from '../config/BoardSaveFile.js';
import { commentSaveFile } from '../config/CommentSaveFile.js';
import { imgDelete } from '../config/imgDelete.js';
import { dbPool } from '../config/mysql.js';
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

    filename: function (req, file, cb) {        //destination에 저장된 파일명
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 3 * 1024 * 1024 },
});



//-----------------------------------------비즈니스 로직
const loginCheck = (email, password) => {
    return members.find(member => member.email === email && member.password === password);
}
const findById = (memberId) => {
    return members.find(member => memberId === member.id);
}

const memberRegister = (imagePath, data) => {
    const memberId = members.length > 0 ? members[members.length - 1].id + 1 : 1;  //id는 거의 1부터 오름차순으로 올라가기에 members에 가장 마지막 값에서 1을 더해주었다.
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

const emailValidCheck = async (email) => {
    const conn = await dbPool.getConnection();
    try {
        const sql = "select * from member where member_email = ?";
        const [rows, fields] = await conn.execute(sql, [email]);


        if (rows.length > 0) {
            console.log('이메일이 있데요');
            return true;
        }
        return false;
    } catch (error) {
        console.error(error);
    } finally {
        conn.release();
    }
}

const nicknameValidCheck = async (nickname) => {
    const conn = await dbPool.getConnection();
    const sql = "select member_nickname from member where member_nickname = ?";
    const [currentNickname] = await conn.execute(sql, [nickname]);

    if (currentNickname[0]) {
        return true;
    }
    return false;
}

//--------------------------------------------------------

export const login = (req, res) => {
    const { email, password } = req.body;

    const member = loginCheck(email, password);

    if (member) {
        req.session.userId = member.id;
        res.status(200).json({ message: 'login_success', userId: member.id });
    } else {
        res.status(401).json({ message: 'Authenthication_err' })
    }
}

export const register = (req, res) => {
    upload.single('profileImage')(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                res.status(413).send({ status: 413, message: 'file_too_large' });
                return;
            }
            // 업로드 오류 처리
            res.status(500).json({ message: 'upload_error' });
            return;
        }

        const imagePath = '/' + req.file.path;
        if (!req.body.email || !req.body.password || !req.body.nickname || !req.file) {
            imgDelete(imagePath)
            res.status(400).json({ message: '빈칸이 존재' });
            return;
        }

        // 파일 업로드가 성공하면 여기에 도달한다.
        // req.file을 통해 업로드된 파일에 대한 정보에 접근할 수 있다.
        try {
            if (await emailValidCheck(req.body.email)) {
                console.log('이메일 중복');
                res.status(409).json({ status: 409, message: '이메일 중복' });
                return;
            }

            const conn = await dbPool.getConnection();
            const sql = "insert into member(member_email,member_password,member_nickname,member_profileImage) values(?,?,?,?)";
            const values = [
                req.body.email,
                req.body.password,
                req.body.nickname,
                imagePath
            ]
            const [rows, fields] = await conn.execute(sql, values);
            conn.release();
            res.status(201).json({ status: 201, message: 'regiseter_success' });
        }

        catch (error) {
            console.log(error);
            res.status(500).json({ message: 'error' });
        }
    })
}

export const getMemberProfile = async (req, res) => {
    const memberId = req.userId;
    if (memberId === null) {
        res.status(401).json({ status: 401, message: 'Unauthorization' });
        return;
    }
    const conn = await dbPool.getConnection();
    try {
        const [rows] = await conn.execute('select m.member_id,m.member_profileImage as memberProfileImage from member m where member_id = ?', [memberId])
        if (rows.length === 0) {
            res.status(404).json({ status: 404, message: 'member_not_found' });
            return;
        }
        res.status(200).json({ status: 200, member: rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, message: 'error' });
    } finally {
        conn.release();
    }
}




export const getMember = async (req, res) => {

    const memberId = req.userId;
    if (memberId === null) {
        res.status(401).json({ status: 401, message: 'Unauthorization' })
        return;
    }
    const conn = await dbPool.getConnection();
    try {
        const sql = `
        select 
        member_id as memberId,
        member_email as memberEmail,
        member_nickname as memberNickname,
        member_profileImage as memberProfileImage,
        created_at as createdAt,
        updated_at as updatedAt
        from member where member_id = ?;
        `
        const [rows] = await conn.execute(sql, [memberId]);
        if (rows.length === 0) {
            res.status(404).json({ status: 404, message: 'member_not_found' });
            return;
        }
        if (rows.length > 0) {
            res.status(200).json({ status: 200, member: rows[0] });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, message: 'error' });
    } finally {
        conn.release();
    }


}

export const memberUpdate = (req, res) => {
    upload.single('profileImage')(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                res.status(413).send({ status: 413, message: 'file_too_large' });
                return;
            }
            // 업로드 오류 처리
            res.status(500).json({ message: 'upload_error' });
            return;
        }


        const memberId = req.userId;
        const conn = await dbPool.getConnection();
        try {
            const sql = `
            select
            member_profileImage as memberProfileImage,
            member_nickname as memberNickname
            from member where member_id = ?;
            `
            const [currentMemberRows] = await conn.execute(sql, [memberId]);
            const currentNickname = currentMemberRows[0].memberNickname;
            if (currentNickname !== req.body.nickname) {        //현재 닉네임과 변경할 닉네임이 같을 경우 넘어감
                if (await nicknameValidCheck(req.body.nickname)) {
                    res.status(400).json({ status: 400, message: "invalid_nickname" })
                    return;
                }
            }

            const currentImage = currentMemberRows[0].memberProfileImage;
            let imagePath= currentImage;
            if(req.file !== undefined){
                imagePath = '/' + req.file.path;
                imgDelete(currentImage);
            }

            const sql2 = 'update member set member_nickname = ?, member_profileImage = ? where member_id = ?';
            const values = [
                req.body.nickname,
                imagePath,
                memberId
            ];
            const [rows2, fields] = await conn.execute(sql2, values);
            res.status(200).json({ status: 200, message: "updata_member_success" })
        } catch (error) {
            console.error(error);
            res.status(500).json({ status: 500, message: "error" });
        } finally {
            conn.release();
        }

    })
}

export const memberPassword = async (req, res) => {
    const memberId = req.userId;

    if (memberId === null) {
        res.status(401).json({ status: 401, message: "Unauthorization" })
        return;
    }
    const conn = await dbPool.getConnection();
    try {
        const [memberRows] = await conn.execute('select member_id as memberId from member where member_id = ?', [memberId]);
        if (memberRows.length === 0) {
            res.status(404).json({ status: 404, message: "member_not_found" });
            return;
        }

        const sql = 'update member set member_password = ? where member_id = ?';
        const values = [req.body.password, memberId];
        const [rows, fields] = await conn.execute(sql, values);
        res.status(200).json({ status: 200, message: "update_password_success" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, message: "error" });
    }
    finally {
        conn.release();
    }
}

export const memberDelete = async (req, res) => {
    const memberId = req.userId;
    if (memberId === null) {
        res.status(401).json({ status: 401, message: "Unauthorization" })
        return;
    }

    const conn =await  dbPool.getConnection();
    try {
        const [memberRows] = await conn.execute('select member_id as memberId,member_profileImage as memberProfileImage from member where member_id = ?', [memberId]);
        if (memberRows.length === 0) {
            res.status(404).json({ status: 404, message: "member_not_found" });
            return;
        }
        const currentImage = memberRows[0].memberProfileImage;
        imgDelete(currentImage);
        const sql = 'delete from member where member_id = ?';
        const [rows, fields] = await conn.execute(sql, [memberId]);
        res.clearCookie('sessionId');
        res.status(200).json({ status: 200, message: "Member delete success!" })
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, message: "error" });
    } finally {
        conn.release();
    }
}



export const logout = (req, res) => {
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

