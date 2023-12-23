{
  let socket; // will be assigned a value later
  let myStream;
  let peer;

  const intrests = ['sport', 'theater', 'kunst', 'wetenschap', 'boeken', 'films', 'koffie'];
  const languages = ['nederlands', 'frans', 'arabisch', 'japans', 'Duits', 'Engels', 'Portugees'];
  const moreAboutMe = ['emphatisch', 'creatief', 'digital nomad', 'ambitieus']

  const tagsData = {
    interests: ['sport', 'theater', 'kunst', 'wetenschap', 'boeken', 'films', 'koffie'],
    languages: ['nederlands', 'frans', 'arabisch', 'japans', 'Duits', 'Engels', 'Portugees'],
    moreAboutMe: ['emphatisch', 'creatief', 'digital nomad', 'ambitieus'],
  }


  let peers = [];

  let ownAnswer;
  let otherAnswer;

  let state = "start"; // start, waiting, playing, match, noMatch

  const $reset = document.querySelector(".reset");

  const $myCamera = document.getElementById("myCamera");
  const $otherCamera = document.getElementById("otherCamera");
  const $peerSelect = document.getElementById("peerSelect");
  const $canvas = document.getElementsByTagName("canvas")[0];
  const $peerSelectWrapper = document.querySelector(".peerSelect__wrapper");

  const tags = document.querySelectorAll(".tag");
  const inputs = document.querySelectorAll("input");

  let ownTags;
  const ownInputs = document.querySelectorAll(".myProfile input");

  let otherTags;
  const otherInputs = document.querySelectorAll(".otherProfile input");

  const $likeButton = document.getElementById("like");
  const $dislikeButton = document.getElementById("dislike");
  const buttons = document.querySelectorAll("button");
  const $buttonsWrapper = document.querySelector(".buttons__wrapper");
  const $matchInfo = document.querySelector(".matchInfo");

  const $ownProfile = document.querySelector(".myProfile");
  const $otherProfile = document.querySelector(".otherProfile");
  const $profilesWrapper = document.querySelector(".profiles__wrapper");
  const profiles = document.querySelectorAll(".profile");

  const $start = document.querySelector(".start");
  const $message = document.querySelector(".message");

  const waitingElements = document.querySelectorAll(".waiting");
  const playingElements = document.querySelectorAll(".playing");
  const matchElements = document.querySelectorAll(".match");
  const noMatchElements = document.querySelectorAll(".noMatch");
  const $intro = document.querySelector(".intro");

  const servers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  const init = async () => {
    //initSocket();
    
    setUpTags();
    updateInterface();
    $peerSelect.addEventListener("input", callSelectedPeer);

    $reset.addEventListener("click", reset);

    $start.addEventListener("click", async () => {
      console.log("start");
      state = "waiting";
      updateInterface();

      initSocket();
      // set up camera
      const constraints = { audio: false, video: { width: 250, height: 250 } };
      myStream = await navigator.mediaDevices.getUserMedia(constraints);

      $myCamera.srcObject = myStream;
      $myCamera.onloadedmetadata = () => $myCamera.play();
    });

    ownTags.forEach((tag) => {
      tag.addEventListener("click", () => {
        console.log(state);
        if(state === 'playing'){
          if (tag.classList.contains("active")) {
            tag.classList.remove("active");
            console.log(tag.textContent);
            socket.emit("tag", { tag: tag.textContent, peerId: peer.data.id });
          } else {
            tag.classList.add("active");
            console.log(tag.textContent);
            socket.emit("tag", { tag: tag.textContent, peerId: peer.data.id });
          }
        }
      })
    });

    ownInputs.forEach((input) => {
      input.addEventListener("input", () => {
        console.log(input.value);
        if(state === 'playing'){
          socket.emit("input", {
            input: input.value,
            name: input.name,
            peerId: peer.data.id,
          });
        }
      });
    });

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        socket.emit("match", { buttonId: button.id, peerId: peer.data.id });
        ownAnswer = button.id;
        
        // lock otherProfile
        socket.emit("lockProfile", peer.data.id);
        lockProfile($otherProfile);

        $buttonsWrapper.classList.add("hidden");


        checkMatch();
      });
    });
  };

  const setUpTags = () => {
    for(const category in tagsData){
      console.log(category);
      console.log(tagsData[category]);
      tagsData[category].forEach((tag) => {
        $ownProfile.querySelector(`#${category}`).innerHTML += `<div class="tag">${tag}</div>`
        $otherProfile.querySelector(`#${category}`).innerHTML += `<div class="tag">${tag}</div>`
      })
    }
    ownTags = document.querySelectorAll(".myProfile .tag");
    otherTags = document.querySelectorAll(".otherProfile .tag");

  }

  const initSocket = () => {

      console.log(state);
      socket = io.connect("/");
      socket.on("connect", () => {
        console.log(socket.id);
      });
    

    socket.on('clients', clients => {
      if(state === 'waiting') {
        updatePeerList(clients);
        console.log(peers);
      }
    });





    socket.on("client-disconnect", (client) => {
      if (peer && peer.data.id === client.id) {
        peer.destroy();
      }
    });
    socket.on("signal", async (myId, signal, peerId) => {
      console.log(`Received signal from ${peerId}`);
      console.log(signal);
      if (peer) {
        peer.signal(signal);
      } else if (signal.type === "offer") {
        createPeer(false, peerId);
        peer.signal(signal);
      }
    });

    socket.on("tag", (data) => {
      console.log(data);
      otherTags.forEach((tag) => {
        if (tag.textContent === data) {
          if (tag.classList.contains("active")) tag.classList.remove("active");
          else tag.classList.add("active");
        }
      });
    });

    socket.on("input", (data) => {
      console.log(data);
      otherInputs.forEach((input) => {
        if (input.name === data.name) {
          input.value = data.input;
        }
      });
    });

    socket.on("lockProfile", () => {
      lockProfile($ownProfile);
    });

    socket.on("match", (data) => {
      otherAnswer = data;

      checkMatch();
    });
  };

  const lockProfile = ($profile) => {
    $profile.querySelectorAll("input").forEach((input) => {
      input.disabled = true;
    });
  };

  const updatePeerList = (clients) => {

    peers = [];
    $peerSelect.innerHTML =
      '<option value="none">--- Select Peer To Call ---</option>';
    for (const clientId in clients) {
      
      const isMyOwnId = clientId === socket.id;
      if (clients.hasOwnProperty(clientId) && !isMyOwnId) {
        //const client = clients[clientId];

        peers.push(clientId);
        const $option = document.createElement("option");
        $option.value = clientId;
        $option.textContent = clientId;
        $peerSelect.appendChild($option);  

      }
    }
  };

  const checkMatch = () => {
    console.log("checking match");
    console.log(ownAnswer, otherAnswer);
    if (!ownAnswer || !otherAnswer) {
      console.log("no answer yet");
      if(!ownAnswer){
        if(otherAnswer === 'like'){
          $message.innerHTML = "The other one likes you!";
        } else if(otherAnswer === 'dislike'){
          $message.innerHTML = "The other one doesn't like you...";
          $buttonsWrapper.classList.add("hidden"); 
          $reset.classList.remove("hidden");
        }
       
      }else{
        if(ownAnswer === 'like'){
          $message.innerHTML = "Still waiting for the other one...";
        }else if(ownAnswer === 'dislike'){
          state = 'noMatch';
          updateInterface();

        }
      }
    } else if (ownAnswer === otherAnswer && ownAnswer === "like") {
      console.log("match");
      state = 'match';
      updateInterface();
    } else {
      console.log("no match");
      state = 'noMatch'
      updateInterface();
    }
  };


  const callSelectedPeer = async () => {
    if ($peerSelect.value === "none") {
      if (peer) {
        peer.destroy();
        return;
      }
    }
    console.log("call selected peer", $peerSelect.value);
    createPeer(true, $peerSelect.value);
  };

  const callPeer = async (peerId) => {
    console.log("calling peer", peerId);
    createPeer(true, peerId);
  };

  const createPeer = (initiatorValue, peerId) => {
    peer = new SimplePeer({ initiator: initiatorValue, stream: myStream });
    peer.data = {
      id: peerId,
    };
    peer.on("signal", (data) => {
      console.log("sending signal");
      socket.emit("signal", peerId, data);
    });
    peer.on("stream", (stream) => {
      console.log("received stream");
      $otherCamera.srcObject = stream;
      state = "playing";
      updateInterface();
      socket.emit("delete", peerId);
    });
    peer.on("close", () => {
      console.log("closed");
      state = "start";
      updateInterface();
      peer.destroy();
      peer = null;
      socket.disconnect();
    });
    peer.on("error", (err) => {
      console.log(err);
    });
  };

  const clearProfile = () => {
    otherTags.forEach((tag) => {
      tag.classList.remove("active");
    });
    otherInputs.forEach((input) => {
      input.value = "";
    });

    ownInputs.forEach((input) => {
      input.value = "";
    });

    ownTags.forEach((tag) => {
      tag.classList.remove("active");
    });
  };

  const updateInterface = () => {
    const $status = document.querySelector(".status");
    if (state == "start") {
      playingElements.forEach((element) => {
        element.classList.add("hidden");
      });
      matchElements.forEach((element) => {
        element.classList.add("hidden");
      });
      noMatchElements.forEach((element) => {
        element.classList.add("hidden");
      });
      waitingElements.forEach((element) => {
        element.classList.add("hidden");
      });
      $intro.classList.remove("hidden");
      
      clearProfile();
      $status.innerHTML = "";
      $message.innerHTML = "";
      ownAnswer = null;
      otherAnswer = null;

    } else if (state == "waiting") {
      $intro.classList.add("hidden");
      playingElements.forEach((element) => {
        element.classList.add("hidden");
      });
      matchElements.forEach((element) => {
        element.classList.add("hidden");
      });
      noMatchElements.forEach((element) => {
        element.classList.add("hidden");
      });
      waitingElements.forEach((element) => {
        element.classList.remove("hidden");
      });

      $status.innerHTML = "Waiting for other player";
      
    } else if (state == "playing") {
      // update blur style
      $myCamera.style.filter = "blur(5px)";
      $otherCamera.style.filter = "blur(5px)";

      $intro.classList.add("hidden");
      matchElements.forEach((element) => {
        element.classList.add("hidden");
      });
      noMatchElements.forEach((element) => {
        element.classList.add("hidden");
      });
      waitingElements.forEach((element) => {
        element.classList.add("hidden");
      });
      playingElements.forEach((element) => {
        element.classList.remove("hidden");
      });



      $status.innerHTML = "Playing";

    }else if(state == 'match'){
      $message.innerHTML = "It's a match!";
      $myCamera.style.filter = "blur(0px)";
      $otherCamera.style.filter = "blur(0px)";
      
      $intro.classList.add("hidden");
      noMatchElements.forEach((element) => {
        element.classList.add("hidden");
      });
      waitingElements.forEach((element) => {
        element.classList.add("hidden");
      });
      playingElements.forEach((element) => {
        element.classList.add("hidden");
      });
      matchElements.forEach((element) => {
        element.classList.remove("hidden");
      });


    }else if(state == 'noMatch'){
      $message.innerHTML = "No match :-(";
      
      $intro.classList.add("hidden");
      waitingElements.forEach((element) => {
        element.classList.add("hidden");
      });
      playingElements.forEach((element) => {
        element.classList.add("hidden");
      });
      matchElements.forEach((element) => {
        element.classList.add("hidden");
      });
      noMatchElements.forEach((element) => {
        element.classList.remove("hidden");
      });
    }
  };

  const reset = () => {
    state = 'start';
    ownAnswer = null;
    otherAnswer = null;
    $message.innerHTML = "";
    clearProfile();



    if(peer){
      peer.destroy();
      peer = null;
    }
    
    socket.disconnect();
    updateInterface();
  }

  init();
}
