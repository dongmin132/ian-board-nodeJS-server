import fs from 'fs';
import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { boards } from '../models/boards.js'
import { members } from '../models/members.js'
import { comments } from '../models/comments.js'
import path from 'path'; // path 모듈 import
import { getCurrentDateTime } from '../utils/getDate.js';
import { commentSaveFile } from '../config/CommentSaveFile.js';


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//세션 및 쿠키 설정
app.use(cookieParser());

//----------------------비즈니스 로직----------------------
// const addMemberData = (comment) => {
//     const matchingMember = members.find(member => comment.userId === member.id);
//     console.log(JSON.stringify(matchingMember,null,2))

//     return {
//         ...comment,
//         memberNickname: matchingMember ? matchingMember.nickname : null,
//         memberProfileImage: matchingMember ? matchingMember.profile_image : null,
//         memberId:matchingMember?matchingMember.id:null
//     };
// }

const commentRegister = (data,pathVariable,userId) => {
    const commentId = comments.length > 0 ?comments[comments.length - 1].id + 1 : 1;

    const comment = {
        id : commentId,
        // JSON 형식에서는 정수 값은 정수형으로 파싱하기 때문에 parseInt를 안써도 됨.
        userId : userId,    
        // "boardId는 특정 게시판의 댓글을 가져오는 것" 이라는 의미를 지니고 있으므로 요청 body가 아닌 path variable로 받아오자
        boardId : parseInt(pathVariable.boardId),
        content : data.content,
        createdAt : getCurrentDateTime()
        
    }
    return comment;
}



//------------------------------------------------------
// 나중에 reduce를 활용하여서도 한번 해보자
// export const getComments = (req, res) => {
//     const userId=req.userId;
//     const boardId = parseInt(req.params.boardId);
//     const commentData = comments.filter(comment => boardId === comment.boardId)   // 여러개 뽑아오기

//     try {
//         const commentsWithMemberDto = commentData.map(comment => addMemberData(comment));
//         res.status(200).json({ message: "comments_list_success", status: 200, data: commentsWithMemberDto, userId:userId });
//     } catch (error) {
//         res.status(500).json({ message: "An error occurred while processing the comments", status: 500 });
//     }
// }


export const createComment = (req, res) => {
    const userId = req.userId;
    console.log("boardId :",req.params.boardId);
    if(!boards.find(board=>parseInt(req.params.boardId)===board.id)) {
        res.status(400).json({status:400,message:'invalid_board_id'})
        return ;
    }
    if(!userId) {
        res.status(401).json({status:401,message:'not_authorization'})
        return ;
    }
    if(!req.body.content) {
        res.status(400).json({status:400,message:'message_empty'})
        return ;
    }

    const comment = commentRegister(req.body,req.params,userId);
    comments.push(comment);
    commentSaveFile(comments);

    res.status(201).json({status:201,message:'comment_register_success'});
}

export const updateComment = (req,res) => {
    const userId = req.userId;
    const commentId = parseInt(req.params.commentId);
    const commentIndex = comments.findIndex(comment => commentId === comment.id);
    if(commentIndex===-1) {
        res.status(404).json({status:404,message:"comment_not_found"});
        return ;
    }
    if(parseInt(req.params.boardId)!==comments[commentIndex].boardId) {
        console.log(`commentIndex: ${commentIndex}`)
        console.log(req.params.boardId,comments[commentIndex].boardId)
        res.status(404).json({status:404,message:"boardId_mismatch"})
        return ;
    }
    if(!userId){
        res.status(401).json({status:401,message:"not_authorization"});
        return ;
    }
    if(comments[commentIndex].userId!==userId)
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
    const userId = req.userId
    const commentId = parseInt(req.params.commentId);
    console.log("커멘트 ID:",commentId);
    const commentIndex = comments.findIndex(comment => commentId === comment.id);
    if(commentIndex===-1) {
        res.status(404).json({status:404,message:"comment_not_found"});
        return ;
    }
    if(!userId) {
        res.status(401).json({status:401,message:"Not_Authentication"})
    }
    console.log("삭제 할때 commentIndex는 ",commentIndex);
    if(userId!==comments[commentIndex].userId) {
        res.status(403).json({status:403,message:"permission_not_matched_member"})
        return ;
    }
    
   
    comments.splice(commentIndex,1)
    commentSaveFile(comments);
    res.status(200).json({status:200,message:"comment_delete_success"});
}