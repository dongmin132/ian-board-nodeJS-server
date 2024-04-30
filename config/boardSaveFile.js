import fs from 'fs';
export const boardSaveFile = (boardJsonFile) => {
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