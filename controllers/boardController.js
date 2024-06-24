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
import { dbPool } from '../config/mysql.js';
import { EventEmitter } from 'events';

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
// board 하나의 멤버 정보를 담아준다.
const boardWithMemberDto = async (boardId) => {
    const conn = await dbPool.getConnection();
    try {
        const sql = `
        select 
            b.board_id as boardId,
            b.board_title as boardTitle,
            b.board_content as boardContent,
            b.board_view_count as boardViewCount,
            bi.board_image_url as boardImage,
            b.member_id as memberId,
            m.member_profileImage as memberProfileImage,
            m.member_nickname as memberNickname,
            (select count(*) from comment c where c.board_id = b.board_id) as boardCommentCount
        from board b
        join
            member m on b.member_id = m.member_id
        left join 
            board_image bi on b.board_id = bi.board_id
        where b.board_id = ?;
        `
        const [rows, fields] = await conn.execute(sql, [boardId]);
        console.log(rows[0]);

        return rows[0];
    } catch (error) {
        throw error;
    } finally {
        conn.release();
    }
}

// board 하나의 댓글 정보를 담아준다.
const boardWithCommentsDto = async (boardId) => {
    const conn = await dbPool.getConnection();
    try {
        const sql = `
        select 
            c.comment_id as commentId,
            c.member_id as memberId,
            c.comment_content as commentContent,
            c.created_at as commentCreatedAt,
            m.member_profileImage as memberProfileImage,
            m.member_nickname as memberNickname
        from comment c
        join
            member m on c.member_id = m.member_id
        where c.board_id = ?
        ORDER BY c.created_at DESC;
        `;
        const [rows, fields] = await conn.execute(sql, [boardId]);
        return rows;
    } catch (error) {
        throw error;
    } finally {
        conn.release();
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

const notificationEvents = new EventEmitter();

const clients = [];
/*---------------------------------------------*/

export const getBoardsWithMember = async (req, res) => {
    // console.log(`세션값: ${JSON.stringify(req.session.userId)}`);
    // const boardsWithMember = boardsWithMemberDto();
    // if (boards.length) {
    //     res.status(200).json({ status: 200, message: "get_post", data: boardsWithMember })
    // } else {
    //     res.status(404).json({ status: 404, message: "No boards found" });
    // }
    const memberId = req.userId || null;
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    const offset = (page - 1) * limit;
    const sql = `
    select 
    b.board_id as boardId,
    b.board_title as boardTitle,
    b.board_content as boardContent,
    b.board_view_count as boardViewCount,
    (select count(*) from comment c where c.board_id = b.board_id) as boardCommentCount,
    b.created_at as createdAt,
    m.member_profileImage as memberProfileImage,
    m.member_nickname as memberNickname,
    GROUP_CONCAT(bi.board_image_url SEPARATOR ',') AS boardImages,
    (select count(*) from board_like bl where bl.board_id = b.board_id and bl.member_id = ?) as boardLikeCount,
    (select count(*) from board_like bl where bl.board_id = b.board_id) as boardTotalLikeCount
from board b
join 
    member m on b.member_id = m.member_id
left join
    board_image bi on b.board_id = bi.board_id
GROUP BY b.board_id
ORDER BY 
    b.created_at DESC
LIMIT ${limit}
OFFSET ${offset};
`;
    try {
        const connection = await dbPool.getConnection();
        const values = [
            memberId, limit, offset
        ];
        const [rows, fields] = await connection.execute(sql, [memberId]);
        const boardsWithMember = rows;
        connection.release();
        res.status(200).json({ status: 200, message: "get_post", data: boardsWithMember });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }

}

export const createBoarad = (req, res) => {
    upload.array('contentImage', 5)(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                res.status(413).send({ status: 413, message: 'file_too_large' });
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

        const conn = await dbPool.getConnection();
        try {

            await conn.beginTransaction();

            const sql = "insert into board(board_title,board_content,member_id) values(?,?,?)";
            const values = [
                req.body.title,
                req.body.content,
                userId,
            ]
            const [rows, fields] = await conn.execute(sql, values);
            const filePaths = req.files ? req.files.map(file => ImageSave(file)) : [];
            if (filePaths.length > 0) {
                console.log(filePaths);
                for (let i = 0; i < filePaths.length; i++) {
                    const imageSql = "insert into board_image(board_id,board_image_name,board_image_url, board_image_rep_yn) values(?,?,?,?)";
                    console.log(req.files[i].originalname = Buffer.from(req.files[i].originalname, 'ascii').toString('utf8'));
                    const imageValues = [
                        rows.insertId,
                        req.files[i].originalname = Buffer.from(req.files[i].originalname, 'ascii').toString('utf8'),
                        filePaths[i],
                        (i === 0) ? 'Y' : 'N'
                    ]
                    await conn.execute(imageSql, imageValues);
                }
            }
            await conn.commit();

            conn.release();
            res.status(201).json({ status: 201, message: "board_register_success" })
        } catch (error) {
            if (conn) await conn.rollback();
            console.error(error);
            res.status(500).json({ status: 500, message: "Internal Server Error" });
        }
    })
}

export const incrementView = async (req, res) => {
    const boardId = parseInt(req.params.boardId);
    const conn = await dbPool.getConnection();
    try {
        const [rows, fields] = await conn.execute('update board set board_view_count = board_view_count + 1 where board_id = ?', [boardId]);
        res.status(200).json({ status: 200, message: "increment_view_success" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    } finally {
        conn.release();
    }

}

export const checkLike = async (req, res) => {
    const boardId = parseInt(req.params.boardId);
    const memberId = req.userId;
    const conn = await dbPool.getConnection();
    try {
        const [likeRows] = await conn.execute('SELECT * FROM board_like WHERE board_id = ? AND member_id = ?', [boardId, memberId]);
        if (likeRows.length > 0) {
            // 좋아요를 눌렀다면
            res.status(200).json({ status: 200, message: "liked", data: true });
        } else {
            // 좋아요를 누르지 않았다면
            res.status(200).json({ status: 200, message: "not_liked", data: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    } finally {
        conn.release();
    }
}

export const postLike = async (req, res) => {
    const boardId = parseInt(req.params.boardId);
    const memberId = req.userId;
    const conn = await dbPool.getConnection();
    try {
        await conn.beginTransaction();
        const [likeRows] = await conn.execute("select * from board_like where board_id = ? and member_id = ?", [boardId, memberId]);
        if (likeRows.length > 0) {
            await conn.execute('delete from board_like where board_id = ? and member_id = ?', [boardId, memberId]);

            // 좋아요를 취소하면 알림도 삭제
            await conn.execute('delete from notification where board_id = ? and sender_id = ? and notification_type = ?', [boardId, memberId, 'like']);

            await conn.commit();
        } else {
            const [likeResult] = await conn.execute('insert into board_like (board_id, member_id) values (?, ?)', [boardId, memberId]);
            const likeId = likeResult.insertId; // 좋아요 ID 가져오기

            const [OwnerIdRows] = await conn.execute('select member_id from board where board_id = ?', [boardId]);
            const receiverId = OwnerIdRows[0].member_id;

            const [notiResult] = await conn.execute('INSERT INTO notification (receiver_id, board_id, sender_id, notification_type, reference_id) VALUES (?, ?, ?, ?, ?)',
                [receiverId, boardId, memberId, 'like', likeId]);

            const notificationId = notiResult.insertId;

            await conn.commit();

            notificationEvents.emit('like', notificationId,receiverId);

        }
        res.status(200).json({ status: 200, message: "like_success" });

    } catch (error) {
        console.error(error);
        if (conn) await conn.rollback();
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    } finally {
        conn.release();
    }
}

export const patchNoti = async (req,res) => {
    const receiverId = req.userId;
    const conn = await dbPool.getConnection();
    try {
        await conn.execute('update notification set is_read = true where receiver_id = ?', [receiverId]);
        res.status(200).json({ status: 200, message: "notification_read_success" });
    }   catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }   finally {
        conn.release();
    }
}

export const getBoardWithMemberWithComments = async (req, res) => {
    const userId = req.userId;
    const boardId = parseInt(req.params.boardId);
    try {
        const boardMemberDto = await boardWithMemberDto(boardId);
        if (!boardMemberDto) {
            res.status(404).json({ status: 404, message: "Board not found" });
            return;
        }
        const commentsMembersDto = await boardWithCommentsDto(boardId);
        res.status(200).json({ status: 200, message: 'get_data_success', board: boardMemberDto, userId: userId, commentData: commentsMembersDto });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }

}

export const updateBoard = (req, res) => {
    upload.single('contentImage')(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                res.status(413).send({ status: 413, message: 'file_too_large' });
                return;
            }
            // 업로드 오류 처리
            res.status(500).json({ message: 'upload_error' });
            return;
        }
        const userId = req.userId;
        const boardId = parseInt(req.params.boardId)
        if (!userId) {
            res.status(401).json({ message: 'Authentication required', status: 401 });
            return;
        }


        const conn = await dbPool.getConnection();
        try {
            const [currentImageRows] = await conn.execute('SELECT board_image_url FROM board_image WHERE board_id = ?', [boardId]);
            const currentImagePath = currentImageRows[0]?.board_image_url;

            await conn.beginTransaction();
            //이미지를 저장하고 파일 경로를 리턴함.
            const imagePath = req.file ? ImageSave(req.file) : null;
            const sql = `
            update board set board_title = ?, board_content = ? where board_id = ?;
            `
            const values = [
                req.body.title,
                req.body.content,
                boardId
            ]
            const [rows, fields] = await conn.execute(sql, values);

            if (imagePath) {
                let imageSql;
                let imageValues;
                if (currentImagePath) {
                    imageSql = `
                update board_image set board_image_name = ?, board_image_url = ? where board_id = ?;
                `
                    imageValues = [
                        req.file.originalname = Buffer.from(req.file.originalname, 'ascii').toString('utf8'),
                        imagePath,
                        boardId
                    ]
                    //이전 이미지 삭제
                    imgDelete(currentImagePath);
                } else {
                    imageSql = `
                    insert into board_image (board_image_name, board_image_url, board_id) values (?, ?, ?);
                    `
                    imageValues = [
                        req.file.originalname = Buffer.from(req.file.originalname, 'ascii').toString('utf8'),
                        imagePath,
                        boardId
                    ]
                }

                await conn.execute(imageSql, imageValues);
            }
            await conn.commit();
            res.status(200).json({ status: 200, message: "board_update_success" })
        } catch (error) {
            if (conn) await conn.rollback();
            console.error(error);
            res.status(500).json({ status: 500, message: "Internal Server Error" });
        } finally {
            conn.release();
        }
    })

}

export const deleteBoard = async (req, res) => {

    const userId = req.userId;
    const boardId = parseInt(req.params.boardId);


    if (!userId) {
        res.status(401).json({ status: 401, message: "Not_Authentication" })
    }

    const conn = await dbPool.getConnection();
    try {
        const [boardRows] = await conn.execute('SELECT * FROM board WHERE board_id = ?', [boardId]);
        if (boardRows.length === 0) {
            res.status(404).json({ status: 404, message: "Board not found" });
            return;
        }

        if (boardRows[0].user_id !== userId) {
            res.status(403).json({ status: 403, message: "Forbidden" });
            return;
        }

        const sql = `
        delete from board where board_id = ?;
        `
        const [rows, fields] = await conn.execute(sql, [boardId]);
        res.status(200).json({ status: 200, message: 'board_delete_sucess' })
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    } finally {
        conn.release();
    }

}


export const getSse = async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const memberId = req.userId;

    if (!clients[memberId]) {
        clients[memberId] = [];
    }

    clients[memberId].push(res);

    const conn = await dbPool.getConnection();
    // 클라이언트가 연결될 때 최초 1회만 보내줌
    const sql = `
        select
            bi.board_image_url as boardImage,
            m.member_nickname as senderNickname,
            m.member_profileImage as memberProfileImage,
            n.notification_type as notificationType,
            n.created_at as createdAt,
            n.is_read as isRead,
            (select count(*) from notification where receiver_id = ? and is_read = false) as likeCount
        from notification n
        join
            member m on n.sender_id = m.member_id
        left join
            board_image bi on n.board_id = bi.board_id and bi.board_image_rep_yn = 'Y'
        where n.receiver_id = ?;
    `

    try {
        const [rows] = await conn.query(sql, [memberId,memberId]);

        rows.forEach(notification => {
            res.write(`data: ${JSON.stringify(notification)}\n\n`);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving notifications');
    } finally {
        conn.release();
    }

    req.on('close', () => {
        clients[memberId] = clients[memberId].filter(client => client !== res);
    });
}

notificationEvents.on('like', async (notificationId,receiverId) => {
    const conn = await dbPool.getConnection();

    const sql = `
    select
        bi.board_image_url as boardImage,
        m.member_nickname as senderNickname,
        m.member_profileImage as memberProfileImage,
        n.notification_type as notificationType,
        n.created_at as createdAt,
        n.is_read as isRead,
        n.receiver_id as receiverId,
        (select count(*) from notification where receiver_id=? and is_read = false) as likeCount
    from notification n
    join
        member m on n.sender_id = m.member_id
    left join
        board_image bi on n.board_id = bi.board_id and bi.board_image_rep_yn = 'Y'
    where n.notification_id = ?;
`
    try {
        const [rows] = await conn.query(sql, [receiverId,notificationId]);
        rows.forEach(notification => {
            const receiverId = notification.receiverId;
            if (clients[receiverId]) {
                clients[receiverId].forEach(client => {
                    client.write(`data: ${JSON.stringify(notification)}\n\n`);
                });
            }
        });
    } catch (error) {
        console.error(error);
    } finally {
        conn.release();
    }

});


