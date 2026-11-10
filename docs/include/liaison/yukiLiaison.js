const serverAddr = "ws://liaison.yuki.observer:8880"
openpgp.initWorker({ path:'/include/liaison/openpgp.worker.min.js' });

// const serverAddr = "ws://[::1]:8880"
// openpgp.initWorker({ path:'./include/liaison/openpgp.worker.min.js' });

(async () => {
    var textID = "liaisonBox";
    var textContent = "";
    var sysContent = "";
    var keyInput = "";
    var withBlinkLine = 0;
    var publicKeyChanged = 0;
    var toBottomFlag = 0;
    var publicKeyString;
    
    let socket = new WebSocket(serverAddr);

    function changeColor(backgroundColor){
        document.body.style.background = backgroundColor;
    }
    window.addEventListener("load",function() {changeColor('black') });

    function sysPrint(sysMessage){
        if(sysMessage != "") sysContent = "PROGRAM # " + sysMessage + "\n";
        else sysContent = "";
    }

    function refreshScreen(){
        setInterval(function() {document.getElementById(textID).value = sysContent + "\n" + textContent + keyInput + ((withBlinkLine == 1)? "_" : "");
        
        if(document.getElementById(textID).style.height != (document.body.clientHeight - 20) + "px"){
            document.getElementById(textID).style.height = (document.body.clientHeight - 20) + "px";
        }
        if(toBottomFlag == 1){
            document.getElementById(textID).scrollTop = document.getElementById(textID).scrollHeight;
            toBottomFlag = 0;
        }
            }, 50);
    }
    refreshScreen();

    function blinkLine(){setInterval(function() {withBlinkLine = (withBlinkLine == 0) ? 1 : 0;}, 500);}
    blinkLine();
    sysPrint("User Interface ready.");

    sysPrint("Generating PGP Key...");
    var privateKeyString;
    var generateOptions = {
        userIds: [{ name:"yukiWebUser", email:"randomly@yuki.observer" }],
        numBits: 2048, passphrase: ""
    };

    await openpgp.generateKey(generateOptions).then(function(key) {
        privateKeyString = key.privateKeyArmored;
        publicKeyString = key.publicKeyArmored;
    });
    sysPrint("Key ready.");

    const serverKeyString = `
-----BEGIN PGP PUBLIC KEY BLOCK-----

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
yVftuEI7AiU=
=6rsi
-----END PGP PUBLIC KEY BLOCK-----
`;
    const privateKey = (await openpgp.key.readArmored(privateKeyString)).keys[0];

    socket.onmessage = async function(event) {
        var receivedMessage = event.data;
        if(publicKeyChanged == 0 && receivedMessage == "K##||WBGT_KRV||##"){
            publicKeyChanged = 1;
            return;
        }
        const messageOptions = {
            message: await openpgp.message.readArmored(event.data),
            privateKeys: [privateKey]
        };
        var decryptedMessage;
        const fileFlagStr = "F##||WBGT_FRV||##";
        await openpgp.decrypt(messageOptions).then(plaintext => {
            decryptedMessage = plaintext.data;
            if(decryptedMessage.startsWith(fileFlagStr)){
                var fileCodeAll = decryptedMessage.substring(fileFlagStr.length);
                var fileName = fileCodeAll.substring(0, fileCodeAll.indexOf(fileFlagStr));
                console.log(fileName)
                var fileCode = fileCodeAll.substring(fileCodeAll.indexOf(fileFlagStr) + fileFlagStr.length);
                console.log(fileCode)
                let fileCodeString = atob(fileCode);
                let byteArray = new Uint8Array(fileCodeString.length);
                for (let fIndex = 0; fIndex < fileCodeString.length; fIndex++) {
                    byteArray[fIndex] = fileCodeString.charCodeAt(fIndex);
                }
                let fileBlob = new Blob([byteArray]);
                let fileRcvd = new File([fileBlob], fileName);
                const fileLink = document.createElement('a');
                fileLink.href = URL.createObjectURL(fileRcvd);
                fileLink.download = fileRcvd.name;
                document.body.appendChild(fileLink);
                fileLink.click();
                document.body.removeChild(fileLink);
            }
        });
        if(!decryptedMessage.startsWith(fileFlagStr)){
            textContent = decryptedMessage;
		    toBottomFlag = 1;
        }
    }
    var encryptedMessage;
    document.addEventListener('keydown', async function(event){
        var key = event.key;
        if(key.length == 1)
            keyInput = keyInput + key;
        else if(key == "Enter"){
            // var utcStr = new Date().toUTCString();
            // console.log(utcStr);
            if(publicKeyChanged == 0) socket.send("K" + publicKeyString);
            // keyInput = "[" + utcStr + "]" + keyInput;
            var serverOptions = {
                message: openpgp.message.fromText(keyInput),
                publicKeys: (await openpgp.key.readArmored(serverKeyString)).keys,
                };
            await openpgp.encrypt(serverOptions).then(ciphertext => {
                encryptedMessage = ciphertext.data
                });
            socket.send("E" + encryptedMessage);
            keyInput = "";
        }
        else if(key == "Backspace"){
            keyInput = keyInput.substring(0, keyInput.length - 1);
        }
    });
    sysPrint("Waiting connection...");
    
    function liaisonStart(){
        if(socket.readyState == 1)
            socket.send("K" + publicKeyString);
        else
            setTimeout(liaisonStart, 100);
    }
    setTimeout(liaisonStart, 100);
    sysPrint("");

    function connectionChecker(){setInterval(function() {
        if(socket.readyState != 1){
            sysPrint("Connection is lost.");
            textContent = "";
            return;
        }else{
            socket.send("R");
            sysPrint("");
        }
    }, 500);}
    connectionChecker();

})();


