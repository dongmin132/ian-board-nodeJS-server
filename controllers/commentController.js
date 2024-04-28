import fs from 'fs';
import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { boards } from '../models/boards.js'
import { members } from '../models/members.js'
import { comments } from '../models/comments.js'
import path from 'path'; // path 모듈 import
import { getCurrentDateTime } from '../utils/getDate.js';
import { register } from 'module';


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//세션 및 쿠키 설정
app.use(cookieParser());

//----------------------비즈니스 로직----------------------
const addMemberData = (comment) => {
    const matchingMember = members.find(member => comment.userId === member.id);

    return {
        ...comment,
        memberNickname: matchingMember ? matchingMember.nickname : null,
        memberProfileImage: matchingMember ? matchingMember.profile_image : null,
        memberId:matchingMember?matchingMember.id:null
    };
}

const commentRegister = (data,pathVariable) => {
    const commentId = comments[comments.length - 1].id + 1;

    const comment = {
        id : commentId,
        // JSON 형식에서는 정수 값은 정수형으로 파싱하기 때문에 parseInt를 안써도 됨.
        userId : data.userId,    
        // "boardId는 특정 게시판의 댓글을 가져오는 것" 이라는 의미를 지니고 있으므로 요청 body가 아닌 path variable로 받아오자
        boardId : parseInt(pathVariable.boardId),
        content : data.content,
        createdAt : getCurrentDateTime()
        
    }
    return comment;
}


// 따로 모듈화를 진행할까 생각해봤지만 생각보다 수정할 부분이 많다.
const commentSaveFile = (commentJsonFile) => {
    // memberFile을 JSON.stringify()를 사용하여 JSON 문자열로 변환

    // JSON 문자열을 members.json 파일에 쓰기
    const commentJson=JSON.stringify(commentJsonFile,null,2);
    fs.writeFile('./models/comments.js', 'export const comments =' + commentJson, (err) => {
        if (err) {
            console.error('Error writing JSON file:', err);
        } else {
            console.log('JSON file has been saved.');
        }
    });
};
//------------------------------------------------------
// 나중에 reduce를 활용하여서도 한번 해보자
export const getComments = (req, res) => {
    const boardId = parseInt(req.params.boardId);
    const commentData = comments.filter(comment => boardId === comment.boardId)   // 여러개 뽑아오기

    try {
        const commentsWithMemberDto = commentData.map(comment => addMemberData(comment));
        res.status(200).json({ message: "comments_list_success", status: 200, data: commentsWithMemberDto });
    } catch (error) {
        res.status(500).json({ message: "An error occurred while processing the comments", status: 500 });
    }
}


export const createComment = (req, res) => {
    if(!boards.find(board=>parseInt(req.params.boardId)===board.id)) {
        res.status(400).json({status:400,message:'invalid_board_id'})
        return ;
    }
    if(!req.body.userId) {
        res.status(401).json({status:401,message:'not_authorization'})
        return ;
    }


    const comment = commentRegister(req.body,req.params);
    comments.push(comment);
    commentSaveFile(comments);

    res.status(201).json({status:201,message:'comment_register_success'});
}

export const updateComment = (req,res) => {
    const commentId = parseInt(req.params.commentId);
    const commentIndex = comments.findIndex(comment => commentId === comment.id);
    if(commentIndex===-1) {
        res.status(404).json({status:404,message:"comment_not_found"});
        return ;
    }
    if(parseInt(req.params.boardId)!==comments[commentIndex].boardId) {
        res.status(404).json({status:404,message:"boardId_mismatch"})
    }
    if(req.body.userId===null){
        res.status(401).json({status:401,message:"not_authorization"});
    }
    if(comments[commentIndex].userId!==req.body.userId)
    {
        res.status(403).json({status:403,message:"permission_differen_member"});
        return;
    }
    if(!req.body.content) {
        res.status(400).json({status:400,message:"message_empty"});
        return;
    }
    comments[commentIndex].content = req.body.content;
    commentSaveFile(comments);
    res.status(200).json({status:200, message:"comment_update_success"});
}

export const deleteComment = (req,res) => {
    const commentId = parseInt(req.params.commentId);
    const commentIndex = comments.findIndex(comment => commentId === comment.id);
    if(req.body.userId!==comments[commentIndex]) {
        res.status(403).json({status:403,message:"permission_not_matched_member"})
        return ;
    }
    if(!req.body.userId) {
        res.status(401).json({status:401,message:"Not_Authentication"})
    }


    comments.splice(commentIndex,1)
    commentSaveFile(comments);
    res.status(200).json({status:200,message:"comment_delete_success"});
}