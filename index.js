const express = require('express');
const agPsd = require('ag-psd');
const app = express();
const port = 3000;

app.get('/', (req, res) => {

    res.send('ag-psd');
});

app.listen(port, () => {
    console.log(document)
    console.log(`Server chạy tại http://localhost:${port}`);
});
