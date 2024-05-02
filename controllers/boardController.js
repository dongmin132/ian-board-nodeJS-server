import fs from 'fs';
import express from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
// import { dirname }from 'path';
import { boards } from '../models/boards.js'
import { members } from '../models/members.js'
import { comments } from '../models/comments.js'
import path from 'path'; // path 모듈 import
import { getCurrentDateTime } from '../utils/getDate.js';
import { boardSaveFile } from '../config/BoardSaveFile.js';
import { commentSaveFile } from '../config/CommentSaveFile.js';
import { imgDelete } from '../config/imgDelete.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//세션 및 쿠키 설정
app.use(cookieParser());


const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 3 * 1024 * 1024 }
});


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


const boardRegister = (createdAt, imagePath, datas, userId) => {
    const id = boards.length > 0 ?boards[boards.length - 1].id + 1 : 1;
    const board = {
        id: id,
        title: datas.title.substring(0,26),
        content: datas.content.substring(0, 500),
        //formData 형식에서는 userId 문자열로 변환되기 때문에 변환 작업이 필요하다
        userId: userId,
        contentImage: imagePath,
        createdAt: createdAt
    }
    return board;
}
const deleteBoardCascade = (boardId) => {
    for(let i=comments.length-1;i>=0;i--) {
        if(comments[i].boardId===boardId) {
            comments.splice(i,1);
        }
    }
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

/*---------------------------------------------*/

export const getBoardsWithMember = (req, res) => {
    // console.log(`세션값: ${JSON.stringify(req.session.userId)}`);
    const boardsWithMember = boardsWithMemberDto();
    if (boards.length) {
        res.status(200).json({ status: 200, message: "get_post", data: boardsWithMember })
    } else {
        res.status(404).json({ status: 404, message: "No boards found" });
    }
}

export const createBoarad = (req, res) => {

    upload.single('contentImage')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if(err.code === 'LIMIT_FILE_SIZE') {
                res.status(413).send({status:413,message:'file_too_large'});
                return;
            }
            // 업로드 오류 처리
            res.status(500).json({ message: 'upload_error' });
            return;
        } 
    
        const userId = req.userId;
        if (!members.find(member => member.id === (userId))) {
            res.status(404).json({ message: 'not_found_user', status: 404 })
            return;
        }
        if (!userId) {
            res.status(401).json({ message: 'Authentication required', status: 401 });
            return;
        }

        //이미지를 저장하고 파일 경로를 리턴함.
        const filePath = req.file ? ImageSave(req.file) : null;
        boards.push(boardRegister(getCurrentDateTime(), filePath, req.body, userId));
        boardSaveFile(boards);

        res.status(201).json({ status: 201, message: "board_register_success" })
    })
}

export const getBoardWithComment = (req, res) => {
    const userId = req.userId;
    const boardIndex = boards.findIndex(board => parseInt(req.params.boardId) === board.id);  //이 값이 스트링형일수가있다.
    if (boardIndex === -1) {
        res.status(404).json({ status: 404, message: "not_found_board" })
        return;
    }
    const board = boardWithMemberDto(boards[boardIndex]);

    console.log(board)

    res.status(200).json({ status: 200, message: 'get_data_success', data: board, userId: userId });
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
        if (err instanceof multer.MulterError) {
            if(err.code === 'LIMIT_FILE_SIZE') {
                res.status(413).send({status:413,message:'file_too_large'});
                return;
            }
            // 업로드 오류 처리
            res.status(500).json({ message: 'upload_error' });
            return;
        } 
        const userId = req.userId;
        const boardId = parseInt(req.params.boardId)
        const boardIndex = boards.findIndex(board => board.id === boardId)

        if (!boards.find(board => board.userId === userId)) {
            res.status(404).json({ message: 'not_found_user', status: 404 })
            return;
        }
        if (!userId) {
            res.status(401).json({ message: 'Authentication required', status: 401 });
            return;
        }
        if (boards[boardIndex].userId !== userId) {
            res.status(403).json({ status: 403, message: "permission_not_matched_member" })
            return;
        }
        //이미지를 저장하고 파일 경로를 리턴함.
        const imagePath = req.file ? ImageSave(req.file) : null;

        //이전 이미지 삭제
        imgDelete(boards[boardIndex].contentImage);     

        boards[boardIndex].contentImage
        boards[boardIndex] = {
            ...boards[boardIndex],
            title: req.body.title.substring(0,26),
            content: req.body.content.substring(0, 255),
            userId: userId,
            contentImage: imagePath,
            createdAt: getCurrentDateTime()
        }

        boardSaveFile(boards);

        res.status(200).json({ status: 200, message: "board_update_success" })
    })

}

export const deleteBoard = (req, res) => {
    const userId = req.userId;
    const boardId = parseInt(req.params.boardId);
    const boardIndex = boards.findIndex(board => board.id === boardId)
    if (boardIndex === -1) {
        res.status(404).json({ status: 404, message: 'board_not_found' })
        return;
    }

    if (userId !== boards[boardIndex].userId) {
        res.status(403).json({ status: 403, message: "permission_not_matched_member" })
        return;
    }

    if (!userId) {
        res.status(401).json({ status: 401, message: "Not_Authentication" })
    }


    deleteBoardCascade(boardId);
    imgDelete(boards[boardIndex].contentImage);
    boards.splice(boardIndex, 1);
    boardSaveFile(boards);
    commentSaveFile(comments);

    res.status(200).json({ status: 200, message: 'board_delete_sucess' })
}