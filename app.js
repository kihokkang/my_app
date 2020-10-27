// import modules
var express = require('express');   // npm dependency 추가된 'express' 모듈을 쓰겠다라는 의미
var path = require('path');         // root 폴더의 path경로를 잡아줌
var app = express();                // app이라는 변수에 express 라이브러리를 선언
var mongoose = require('mongoose'); // Mongoose 모듈 사용
var bodyParser = require('body-parser');

// connect database
mongoose.connect(process.env.MONGO_DB);  // Mongoose를 데이터베이스에 연결
var db = mongoose.connection;   // 데이터베이스 정보를 담고있는 오브젝트
db.once("open", function(){
    console.log("DB Connected!");
});
db.on("error", function(err){
    console.log("DB ERROR :", err);
});

// model setting
var postSchema = mongoose.Schema({
    title: {type:String, required:true},
    body: {type:String, required:true},
    createdAt: {type:Date, default:Date.now},
    updatedAt: Date
});
var Post = mongoose.model('post', postSchema);

// view setiing
app.set("view engine", 'ejs');      // express에게 views 폴더를 default로 ejs파일을 찾아 열음


// set middlewares
app.use(express.static(path.join(__dirname, 'public')));    // public이라는 폴더명을 사용하겠다
app.use(bodyParser.json()); // 모든 서버에 도착하는 신호들의 body를 JSON으로 분석

// set routes
/*
GET신호로 /posts 에 접속하는 경우, 게시글(Post)데이터의 모든 데이터를 찾고(Post.find()에 
빈 객체를 전달하는 경우) 에러가 있으면 에러를 response하고(이때 success는 false), 
에러가 없다면 모든 게시글(posts)를 response합니다.(이때 success는 true)
*/
// index
app.get('/posts', function (req,res) {  // Get신호로 /posts에 접속하는경우, 
    Post.find({}, function(err, posts){
    if(err) return res.json({success:false, message:err});
    res.json({success:true, data:posts});
    });
});

/*
POST신호로 /posts 에 접속하는 경우, 요청신호의 body의 post항목(req.body.post)로
데이터를 생성(Post.create())하고 에러가 있으면 에러를 response하고(이때 success는 false), 
에러가 없다면 새 게시글(post)를 response합니다.(이때 success는 true)
*/
// create
app.post('/posts', function (req,res) {  
    Post.create(req.body.post, function(err,post){
    if(err) return res.json({success:false, message:err});
    res.json({success:true, data:post});
    });
});

/*
GET신호로 /posts/:id 에 접속하는 경우, 아이디가 :id인 게시글(Post)의 데이터를 하나 찾고(Post.findById(req.params.id). 
이 명령어는 Post.findOne({_id:req.params.id)와 동일) 에러가 있으면 
에러를 response하고(이때 success는 false), 에러가 없다면 해당 게시글(post)를 response합니다.
(이때 success는 true)
*/
// show
app.get('/posts/:id', function (req,res) {
    Post.findById(req.params.id, function(err, post){
    if(err) return res.json({success:false, message:err});
    res.json({success:true, data:post});
    });
});

/*
PUT신호로 /posts/:id 에 접속하는 경우, 아이디가 :id인 게시글(Post)의 데이터를 하나 찾고
req.body.post로 데이터를 업데이트 합니다.(Post.findByIdAndUpdate(req.params.id, req.body.post)) 
이때 글 수정 시간이 req.body.post에 삽입됩니다. 에러가 있으면 에러를 response하고
(이때 success는 false), 에러가 없다면 해당 updated 메세지를 response합니다.(이때 success는 true)
*/
// update
app.put('/posts/:id', function (req,res) {
    req.body.post.updatedAt=Date.now();
    Post.findByIdAndUpdate(req.params.id, req.body.post, function(err, post){
        if(err) return res.json({success:false, message:err});
        res.json({success:true, message:post._id+" updated"});
    });
});

/* 
DELETE신호로 /posts/:id 에 접속하는 경우, 아이디가 :id인 게시글(Post)의 데이터를 하나 찾아서 지워버립니다.
(Post.findByIdAndRemove(req.params.id)) 에러가 있으면 에러를 response하고(이때 success는 false), 
에러가 없다면 해당 deleted 메세지를 response합니다.(이때 success는 true)
*/
// destroy
app.delete('/posts/:id', function (req,res) {
    Post.findByIdAndRemove(req.params.id, function(err, post){
    if(err) return res.json({success:false, message:err});
    res.json({success:true, message:post._id+" deleted"});
    });
});

// start server
app.listen(3000, function(){    // '3000' 포트를 쓰고 function()을 default로 로딩
    console.log('Server On!');
});