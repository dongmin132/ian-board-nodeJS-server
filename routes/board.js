import express from 'express';
import { getBoard,createBoarad,getBoardWithComment, getBoardsWithMember, updateBoard, deleteBoard } from '../controllers/boardController.js';
import { getComments, createComment, updateComment, deleteComment } from '../controllers/commentController.js'

const router = express.Router();


router.get('/',getBoardsWithMember);

router.post('/',createBoarad);

router.get('/:boardId',getBoardWithComment);

router.get('/:boardId/board',getBoard);

router.put('/:boardId',updateBoard);

router.delete('/:boardId',deleteBoard);

//--------------- commentController ---------------

router.get('/:boardId/comments', getComments);

router.post('/:boardId/comments', createComment);

router.patch('/:boardId/comments/:commentId', updateComment);

router.delete('/:boardId/comments/:commentId', deleteComment);

export default router;