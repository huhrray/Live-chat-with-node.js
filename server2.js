let express = require( "express" );
let app = express();
let http = require( "http" ).Server( app );
let io = require( "socket.io" )( http );
let multer = require( "multer" );
var publicDir = require( "path" ).join( __dirname + "/public" );
app.use( express.static( publicDir ) );
app.get( "/", function( req, res ){
    res.sendFile( __dirname + "/client.html" );
} );



// 채팅 참가자 리스트 관리 => { 소켓아이디 : 닉네임 } 구조
let user_obj = {};
function update_list() {
    io.emit( "update_users", user_obj);
    console.log(user_obj);
}
// 채팅메세지 시간 구하기
function getTime() {
    const now = new Date();
    const hours = now.getHours() < 10 ? "0" + now.getHours() : now.getHours();
    const minutes = now.getMinutes() < 10 ? "0" + now.getMinutes() : now.getMinutes();
    const seconds = now.getSeconds() < 10 ? "0" + now.getSeconds() : now.getSeconds();    
    return `${hours}:${minutes}:${seconds}`;
}

var count = 1
io.on( "connection", function ( socket ){ 
    var name = "User_" + count++;  
    console.log( "New socket connected", socket.id );
    // Add user in the user_obj 
    user_obj[socket.id] =  name 
    io.to(socket.id).emit('default name',name);
    io.emit( "notice", `New user(${name}) has entered the chat.`);
    update_list();

// receive message
    const msgTime = getTime();
    socket.on( "sendMsg", ( msg ) =>{
    // (1) 클라이언트의 닉네임의 변화 체크 + 닉네임 리스트 업데이트
        if ( user_obj[socket.id] !== msg["myName"] ) {
                user_obj[socket.id] = msg["myName"];
                update_list();
        } 
    // (2) 귓속말 여부 체크
        if ( msg["recipient"] === "" ){
            const data = { msg, msgTime};
            io.emit( "newMsg", data )
        }else {
            const data = { msg, msgTime};
            io.to(msg['recipient']).emit("newMsg", data)
            socket.emit( "newMsg", data );
        }
    });
    
    
    socket.on( "disconnect", function () {
        console.log( "user disconnected: ", socket.id );
        io.emit( "notice", `${user_obj[socket.id].slice(0,5)}*****)has left the chat.`)
        delete user_obj[socket.id];
        update_list();
    });
} );

var storage = multer.diskStorage({
	destination( req, file, cb ){
		cb( null, "public/usersdata" );
	},
	filename( req, file, cb ){
		cb( null, Date.now() + "_" + file.originalname );
	}
});


var upload = multer({ storage: storage });

app.post( "/upload", upload.single( "userfile" ), function( req, res ){
	res.send(  "usersdata/"+req.file.filename );
});



http.listen( 3000, ()=>{
    console.log( "listening on *:3000" );
});
