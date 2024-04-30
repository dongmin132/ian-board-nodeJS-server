import fs from 'fs';
// 따로 모듈화를 진행할까 생각해봤지만 생각보다 수정할 부분이 많다.
export const commentSaveFile = (commentJsonFile) => {
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