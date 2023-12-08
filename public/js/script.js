{
  let socket; // will be assigned a value later
  let myStream;
  let peer;

  const $myCamera = document.getElementById("myCamera");
  const $otherCamera = document.getElementById("otherCamera");
  const $peerSelect = document.getElementById("peerSelect");
  const $canvas = document.getElementsByTagName("canvas")[0];

  const tags = document.querySelectorAll(".tag");
  const inputs = document.querySelectorAll("input");

  const ownTags = document.querySelectorAll(".myProfile .tag");
  const ownInputs = document.querySelectorAll(".myProfile input");

  const otherTags = document.querySelectorAll(".otherProfile .tag");
  const otherInputs = document.querySelectorAll(".otherProfile input");

  let colorPicker;

  const servers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  const init = async () => {
    initSocket();

    $peerSelect.addEventListener("input", callSelectedPeer);

    // set up camera
    const constraints = { audio: false, video: { width: 250, height: 250 } };
    myStream = await navigator.mediaDevices.getUserMedia(constraints);

    $myCamera.srcObject = myStream;
    $myCamera.onloadedmetadata = () => $myCamera.play();

    ownTags.forEach((tag) => {
      tag.addEventListener("click", () => {
        if (tag.classList.contains("active")) {
          tag.classList.remove("active");
          console.log(tag.textContent);
          socket.emit("tag", tag.textContent);
        } else {
          tag.classList.add("active");
          console.log(tag.textContent);
          socket.emit("tag", tag.textContent);
        }
      });
    });

    ownInputs.forEach((input) => {
      input.addEventListener("input", () => {
        console.log(input.value);
        socket.emit("input", { input: input.value, name: input.name });
      });
    });
  };

  const initSocket = () => {
    socket = io.connect("/");
    socket.on("connect", () => {
      console.log(socket.id);
    });
    socket.on("clients", updatePeerList);
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
  };

  const updatePeerList = (clients) => {
    $peerSelect.innerHTML =
      '<option value="none">--- Select Peer To Call ---</option>';
    for (const clientId in clients) {
      const isMyOwnId = clientId === socket.id;
      if (clients.hasOwnProperty(clientId) && !isMyOwnId) {
        const client = clients[clientId];
        const $option = document.createElement("option");
        $option.value = clientId;
        $option.textContent = clientId;
        $peerSelect.appendChild($option);
      }
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
      clearProfile();
    });
    peer.on("close", () => {
      console.log("closed");
      peer.destroy();
      peer = null;
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
  }
  init();
}
