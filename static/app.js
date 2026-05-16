let currentUser = null;
let currentPhone = "";

function sendOTP() {
    const phone = document.getElementById("phone").value.trim();
    currentPhone = phone;

    fetch("/send-otp", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ phone: phone })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            document.getElementById("otpSection").style.display = "block";
            document.getElementById("demoOtp").innerText = "Demo OTP: " + data.demo_otp;
            document.getElementById("loginMsg").innerText = "";
        } else {
            document.getElementById("loginMsg").innerText = data.message;
        }
    });
}

function verifyOTP() {
    const otp = document.getElementById("otp").value.trim();

    fetch("/verify-otp", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            phone: currentPhone,
            otp: otp
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            currentUser = data.user;

            document.getElementById("loginBox").style.display = "none";
            document.getElementById("dashboard").style.display = "flex";

            document.getElementById("profileName").innerText = currentUser.name;
            document.getElementById("accountNo").innerText = currentUser.account_no;
            document.getElementById("balanceCard").innerText = "₹" + currentUser.balance;
            document.getElementById("loanCard").innerText = currentUser.loan_score + "%";

            document.getElementById("loanStatus").innerText =
                currentUser.loan_score >= 75 ? "Eligible for loan" : "Improve score to apply loan";

            loadTransactions();
            showSection("balanceSection");
        } else {
            document.getElementById("loginMsg").innerText = data.message;
        }
    });
}

function demoBio() {
    alert("Fingerprint / Face Recognition demo only.");
}

function showSection(sectionId) {
    document.querySelectorAll(".content-section").forEach(section => {
        section.style.display = "none";
    });

    document.getElementById(sectionId).style.display = "block";
}

function loadTransactions() {
    let html = "";

    currentUser.transactions.forEach(t => {
        html += `<p>${t.date} - ${t.type} - ₹${t.amount} - ${t.desc}</p>`;
    });

    document.getElementById("transactionBox").innerHTML = html;
}

function calculateEMI() {
    let amount = Number(document.getElementById("emiAmount").value);
    let rate = Number(document.getElementById("emiRate").value);
    let months = Number(document.getElementById("emiMonths").value);

    if (!amount || !rate || !months) {
        document.getElementById("emiResult").innerText = "Enter all details.";
        return;
    }

    let monthlyRate = rate / 12 / 100;

    let emi = amount * monthlyRate * Math.pow(1 + monthlyRate, months) /
              (Math.pow(1 + monthlyRate, months) - 1);

    document.getElementById("emiResult").innerText =
        "Monthly EMI: ₹" + emi.toFixed(2);
}

function openMap() {
    window.open("https://www.google.com/maps/search/nearby+bank+branches", "_blank");
}

function sendMessage() {
    const messageInput = document.getElementById("message");
    const message = messageInput.value.trim();
    const lang = document.getElementById("language").value;

    if (!message) return;

    const chatBox = document.getElementById("chatBox");

    chatBox.innerHTML += `<div class="user">${message}</div>`;

    fetch("/chat", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            message: message,
            lang: lang,
            phone: currentPhone
        })
    })
    .then(res => res.json())
    .then(data => {
        chatBox.innerHTML += `<div class="bot">${data.reply}</div>`;
        speakText(data.reply, lang);
        chatBox.scrollTop = chatBox.scrollHeight;
        messageInput.value = "";
    });
}

function startVoice() {
    const lang = document.getElementById("language").value;

    let speechLang = "en-IN";
    if (lang === "kn") speechLang = "kn-IN";
    if (lang === "hi") speechLang = "hi-IN";

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Voice recognition not supported in this browser.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = speechLang;
    recognition.start();

    recognition.onresult = function(event) {
        document.getElementById("message").value =
            event.results[0][0].transcript;

        sendMessage();
    };
}

function speakText(text, lang) {
    window.speechSynthesis.cancel();

    let cleanText = text.replace(/<br>/g, " ");

    const speech = new SpeechSynthesisUtterance(cleanText);

    if (lang === "kn") speech.lang = "kn-IN";
    else if (lang === "hi") speech.lang = "hi-IN";
    else speech.lang = "en-IN";

    speech.rate = 0.9;
    speech.volume = 1;

    window.speechSynthesis.speak(speech);
}

function logout() {
    location.reload();
}

function sendMoney() {
    let receiver = document.getElementById("receiver").value.trim();
    let amount = Number(document.getElementById("sendAmount").value);

    if (receiver === "" || amount <= 0) {
        document.getElementById("moneyMsg").innerHTML = "❌ Enter valid details";
        return;
    }

    if (amount > currentUser.balance) {
        document.getElementById("moneyMsg").innerHTML = "❌ Insufficient balance";
        return;
    }

    currentUser.balance -= amount;
    document.getElementById("balanceCard").innerHTML = "₹" + currentUser.balance;

    currentUser.transactions.unshift({
        date: new Date().toLocaleDateString(),
        type: "Debit",
        amount: amount,
        desc: "Money sent to " + receiver
    });

    loadTransactions();

    document.getElementById("moneyMsg").innerHTML =
        `✅ ₹${amount} sent successfully to ${receiver}`;

    document.getElementById("receiver").value = "";
    document.getElementById("sendAmount").value = "";
}

function qrPayment() {
    let receiver = document.getElementById("qrReceiver").value;
    let amount = document.getElementById("qrAmount").value;

    if (!receiver || !amount) {
        document.getElementById("qrBox").innerHTML = "❌ Enter all details";
        return;
    }

    document.getElementById("qrBox").innerHTML = `
        <h3>✅ QR Payment Successful</h3>
        <p>Paid ₹${amount} to ${receiver}</p>
        <div style="font-size:80px;">▣</div>
        <p>Demo QR Payment</p>
    `;
}

function showAnalytics() {
    let food = 0, shopping = 0, travel = 0, bills = 0;

    currentUser.transactions.forEach(t => {
        let d = t.desc.toLowerCase();

        if (t.type.toLowerCase() === "debit") {
            if (d.includes("food") || d.includes("swiggy") || d.includes("restaurant")) food += t.amount;
            else if (d.includes("shopping") || d.includes("amazon") || d.includes("mall")) shopping += t.amount;
            else if (d.includes("travel") || d.includes("flight") || d.includes("fuel")) travel += t.amount;
            else if (d.includes("bill") || d.includes("recharge")) bills += t.amount;
        }
    });

    document.getElementById("analyticsBox").innerHTML = `
        <p>🍔 Food: ₹${food}</p>
        <p>🛍 Shopping: ₹${shopping}</p>
        <p>✈ Travel/Fuel: ₹${travel}</p>
        <p>💡 Bills: ₹${bills}</p>
    `;
}

function downloadStatement() {
    let content = "Bank Statement\n\n";
    content += "Name: " + currentUser.name + "\n";
    content += "Account: " + currentUser.account_no + "\n";
    content += "Balance: ₹" + currentUser.balance + "\n\n";

    currentUser.transactions.forEach(t => {
        content += `${t.date} - ${t.type} - ₹${t.amount} - ${t.desc}\n`;
    });

    let blob = new Blob([content], { type: "text/plain" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "bank_statement.txt";
    link.click();
}

function blockCard() {
    document.getElementById("blockMsg").innerHTML =
        "✅ Your ATM/Debit card has been blocked successfully.";
}

function openATMMap() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            let lat = position.coords.latitude;
            let lon = position.coords.longitude;

            window.open(
                `https://www.google.com/maps/search/atm+near+me/@${lat},${lon},16z`,
                "_blank"
            );
        });
    } else {
        window.open("https://www.google.com/maps/search/atm+near+me", "_blank");
    }
}