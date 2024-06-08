import mysql from 'mysql2/promise';


const db_info = {
    host: 'localhost',
    port: "3306",
    user: "root",
    password: "",
    database: "community_db"
};

// module.exports = {
//     init: function () {
//       return mysql.createConnection(db_info);
//     },
//     connect: function (conn) {
//       conn.connect(function (err) {
//         if (err) console.error("mysql connection error : " + err);
//         else console.log("mysql is connected successfully!");
//       });
//     },
//   };
export const dbPool = mysql.createPool(db_info);

// const getTableData = async (tableName) => {
//   try {
//     const connection = await dbPool.getConnection();
//     const [rows, fields] = await connection.execute(`SELECT * FROM ${tableName};`);
//     connection.release();
//     return rows;
//   } catch (error) {
//     console.error(error);
//     return false;
//   }
// }

// getTableData('member').then((result) => {
//   console.log(result);
// });
