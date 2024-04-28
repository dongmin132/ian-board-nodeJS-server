import fs from 'fs';
import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import multer from 'multer';
// import { dirname }from 'path';
import { boards } from '../models/boards.js'
import { members } from '../models/members.js'
import { comments } from '../models/comments.js'
import path from 'path'; // path 모듈 import
import { getCurrentDateTime } from '../utils/getDate.js';



const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//세션 및 쿠키 설정
app.use(cookieParser());

// multer 설정
const storage = multer.memoryStorage({
    destination: 'img/boards/',        //파일이 저장될 폴더
    limits: { fileSize: 5 * 1024 * 1024 },      //파일 사이즈는 5MB
});
const upload = multer({ storage: storage });


/*---------------비즈니스 로직--------------------*/

//boards의 각 멤버의 정보와 매칭되는 멤버 닉네임과 이미지를 뽑아준다.
const boardsWithMemberDto = () => boards.map(board => {
    const matchingMember = members.find(member => member.id === board.userId);
    const commentsCount = comments.filter(comment => comment.boardId === board.id)
    return {
        ...board,
        memberNickname: matchingMember ? matchingMember.nickname : null,
        memberProfileImage: matchingMember ? matchingMember.profile_image : null,
        commentsCount: commentsCount.length
    };
});
//board 하나의 멤버 정보를 담아준다.
const boardWithMemberDto = (board) => {
    const matchingMember = members.find(member => board.userId === member.id);
    return {
        ...board,
        memberNickname: matchingMember ? matchingMember.nickname : null,
        memberProfileImage: matchingMember ? matchingMember.profile_image : null
    }

}


const boardRegister = (createdAt, imagePath, datas) => {
    const id = boards[boards.length - 1].id + 1;
    const board = {
        id: id,
        title: datas.title,
        content: datas.content,
        //formData 형식에서는 userId 문자열로 변환되기 때문에 변환 작업이 필요하다
        userId: parseInt(datas.userId),
        contentImage: imagePath,
        createdAt: createdAt
    }
    return board;
}



const ImageSave = (file) => {
    const randomImageName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    const filePath = '/img/boards/' + randomImageName;

    try {
        fs.writeFileSync('.' + filePath, file.buffer);      //동기적으로 파일을 쓰므로 파일을 쓰고 리턴이 가능함.
    } catch (err) {
        res.status(500).json({ message: 'file_save_error' });
        return;
    }

    return filePath;
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

const boardSaveFile = (boardJsonFile) => {
    // memberFile을 JSON.stringify()를 사용하여 JSON 문자열로 변환

    // JSON 문자열을 members.json 파일에 쓰기
    const boardJson = JSON.stringify(boardJsonFile, null, 2);
    fs.writeFile('./models/boards.js', 'export const boards =' + boardJson, (err) => {
        if (err) {
            console.error('Error writing JSON file:', err);
        } else {
            console.log('JSON file has been saved.');
        }
    });
};
/*---------------------------------------------*/

export const getBoardsWithMember = (req, res) => {

    const boardsWithMember = boardsWithMemberDto();
    if (boards.length) {
        res.status(200).json({ status: 200, message: "get_post", data: boardsWithMember })
    } else {
        res.status(404).json({ status: 404, message: "No boards found" });
    }
}

export const createBoarad = (req, res) => {

    upload.single('contentImage')(req, res, function (err) {
        if (!boards.find(board => board.userId === parseInt(req.body.userId))) {
            res.status(404).json({ message: 'not_found_user', status: 404 })
            return;
        }
        if (!req.body.userId) {
            res.status(401).json({ message: 'Authentication required', status: 401 });
            return;
        }

        //이미지를 저장하고 파일 경로를 리턴함.
        const filePath = req.file?ImageSave(req.file):null;
        boards.push(boardRegister(getCurrentDateTime(), filePath, req.body));
        boardSaveFile(boards);

        res.status(201).json({ status: 201, message: "board_register_success" })
    })
}

export const getBoardWithComment = (req, res) => {
    const boardIndex = boards.findIndex(board => parseInt(req.params.boardId) === board.id);  //이 값이 스트링형일수가있다.
    if (boardIndex === -1) {
        res.status(404).json({ status: 404, message: "not_found_board" })
        return;
    }
    const board = boardWithMemberDto(boards[boardIndex]);

    res.status(200).json({ status: 200, message: 'get_data_success', data: board });
}

export const getBoard = (req, res) => {
    const boardId = parseInt(req.params.boardId);
    const boardIndex = boards.findIndex(board => board.id === boardId);
    if (boardIndex === -1) {
        res.status(404).json({ status: 404, message: "not_found_board" })
        return;
    }
    const data = boards[boardIndex];
    res.status(200).json({ status: 200, message: "get_board_success", data: data })
}

export const updateBoard = (req, res) => {
    upload.single('contentImage')(req, res, function (err) {
        const boardId = parseInt(req.params.boardId)
        const boardIndex = boards.findIndex(board=> board.id===boardId)
        
        if (!boards.find(board => board.userId === parseInt(req.body.userId))) {
            res.status(404).json({ message: 'not_found_user', status: 404 })
            return;
        }
        if (!req.body.userId) {
            res.status(401).json({ message: 'Authentication required', status: 401 });
            return;
        }

        //이미지를 저장하고 파일 경로를 리턴함.
        const imagePath = req.file?ImageSave(req.file):null;
        
        imgDelete(boards[boardIndex].contentImage);

        boards[boardIndex].contentImage
        boards[boardIndex] = {
            ...boards[boardIndex],
            title: req.body.title,
            content: req.body.content,
            userId: parseInt(req.body.userId),
            contentImage: imagePath,
            createdAt: getCurrentDateTime()
        }
       
        boardSaveFile(boards);

        res.status(201).json({ status: 201, message: "board_register_success" })
    })

}

export const deleteBoard = (req,res) => {
    const boardId = parseInt(req.params.boardId);
    const boardIndex = boards.findIndex(board=> board.id === boardId)
    if (boardIndex === -1) {
        res.status(404).json({status:404,message:'board_not_found'})
        return;
    }
    
    if(boardId!==boards[boardIndex].id) {
        res.status(403).json({status:403,message:"permission_not_matched_member"})
        return ;
    }
    if(!req.body.userId) {
        res.status(401).json({status:401,message:"Not_Authentication"})
    }
    

    imgDelete(boards[boardIndex].contentImage);
    boards.splice(boardIndex,1);
    boardSaveFile(boards);

    res.status(200).json({status:200,message:'board_delete_sucess'})
}