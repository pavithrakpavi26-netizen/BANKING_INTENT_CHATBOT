from flask import Flask, render_template, request, jsonify
import json
import random
import ollama

app = Flask(__name__)

DATA_FILE = "data/users.json"
otp_store = {}


def load_users():
    with open(DATA_FILE, "r") as file:
        return json.load(file)


def find_user(phone):
    phone = str(phone).strip()

    for user in load_users():
        if user["phone"] == phone:
            return user

    return None


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/send-otp", methods=["POST"])
def send_otp():
    data = request.json
    phone = str(data.get("phone", "")).strip()

    user = find_user(phone)

    if not user:
        return jsonify({
            "success": False,
            "message": "Phone number not registered"
        })

    otp = str(random.randint(1000, 9999))
    otp_store[phone] = otp

    print("OTP:", otp)

    return jsonify({
        "success": True,
        "demo_otp": otp
    })


@app.route("/verify-otp", methods=["POST"])
def verify_otp():
    data = request.json
    phone = str(data.get("phone", "")).strip()
    otp = str(data.get("otp", "")).strip()

    if otp_store.get(phone) == otp:
        return jsonify({
            "success": True,
            "user": find_user(phone)
        })

    return jsonify({
        "success": False,
        "message": "Invalid OTP"
    })


@app.route("/chat", methods=["POST"])
def chat():
    data = request.json

    message = data.get("message", "").lower()
    lang = data.get("lang", "en")
    phone = data.get("phone", "")

    user = find_user(phone)

    # DATASET ANSWERS
    if user:
        if "balance" in message or "ಬ್ಯಾಲೆನ್ಸ್" in message or "बैलेंस" in message:
            if lang == "kn":
                reply = f"ನಿಮ್ಮ ಲಭ್ಯವಿರುವ ಬ್ಯಾಲೆನ್ಸ್ ₹{user['balance']}."
            elif lang == "hi":
                reply = f"आपका उपलब्ध बैलेंस ₹{user['balance']} है."
            else:
                reply = f"Your available balance is ₹{user['balance']}."

            return jsonify({"reply": reply})

        if "transaction" in message or "statement" in message or "ವಹಿವಾಟು" in message or "लेनदेन" in message:
            if lang == "kn":
                reply = "ನಿಮ್ಮ ಇತ್ತೀಚಿನ transactions:<br>"
            elif lang == "hi":
                reply = "आपके हाल के transactions:<br>"
            else:
                reply = "Your recent transactions:<br>"

            for t in user["transactions"][-5:]:
                reply += f"{t['date']} - {t['type']} - ₹{t['amount']} - {t['desc']}<br>"

            return jsonify({"reply": reply})

    # FIXED BANKING ANSWERS
    if "apply loan" in message or "loan apply" in message or "how to apply loan" in message:
        if lang == "kn":
            reply = "Loan apply ಮಾಡಲು bank app, website ಅಥವಾ nearest branch ಮೂಲಕ apply ಮಾಡಬಹುದು. KYC, Aadhaar, PAN, income proof ಮತ್ತು bank statement ಬೇಕಾಗುತ್ತದೆ."
        elif lang == "hi":
            reply = "Loan apply करने के लिए bank app, website या nearest branch से apply करें. KYC, Aadhaar, PAN, income proof और bank statement चाहिए."
        else:
            reply = "To apply for a loan, use the bank app, website, or nearest branch. Submit KYC, Aadhaar, PAN, income proof, and bank statement."

        return jsonify({"reply": reply})

    if "loan" in message or "ಲೋನ್" in message or "लोन" in message:
        if user and user["loan_score"] >= 75:
            reply = f"Your loan score is {user['loan_score']}%. You are eligible for a loan."
        elif user:
            reply = f"Your loan score is {user['loan_score']}%. Improve your score to apply for a loan."
        else:
            reply = "To apply for a loan, visit the bank app, website, or nearest branch with KYC and income proof."

        return jsonify({"reply": reply})

    if "atm pin" in message or "generate pin" in message or "pin" in message:
        if lang == "kn":
            reply = "ATM PIN generate ಮಾಡಲು ATM ಗೆ ಹೋಗಿ, card insert ಮಾಡಿ, Generate PIN select ಮಾಡಿ, OTP enter ಮಾಡಿ ಹೊಸ PIN set ಮಾಡಿ."
        elif lang == "hi":
            reply = "ATM PIN बनाने के लिए ATM में card डालें, Generate PIN select करें, OTP enter करें और नया PIN set करें."
        else:
            reply = "To generate ATM PIN, visit ATM, insert card, select Generate PIN, enter OTP, and set new PIN."

        return jsonify({"reply": reply})

    if "withdraw" in message or "cash" in message:
        if lang == "kn":
            reply = "ATM card insert ಮಾಡಿ, PIN enter ಮಾಡಿ, Withdrawal select ಮಾಡಿ, account type choose ಮಾಡಿ, amount enter ಮಾಡಿ cash collect ಮಾಡಿ."
        elif lang == "hi":
            reply = "ATM card डालें, PIN enter करें, Withdrawal select करें, account type चुनें, amount enter करें और cash collect करें."
        else:
            reply = "Insert ATM card, enter PIN, select Withdrawal, choose account type, enter amount, collect cash and receipt."

        return jsonify({"reply": reply})

    if "customer" in message or "care" in message or "help" in message:
        reply = "Customer care number: 1800-123-4567. Never share OTP, ATM PIN, or UPI PIN."
        return jsonify({"reply": reply})

    if "upi" in message:
        reply = "To reset UPI PIN, open your banking app, select Forgot UPI PIN, enter debit card details, verify OTP, and set a new UPI PIN."
        return jsonify({"reply": reply})

    if "emi" in message:
        reply = "Use EMI Calculator section. Enter loan amount, interest rate, and months to calculate monthly EMI."
        return jsonify({"reply": reply})

    # OLLAMA ANSWERS
    system_prompt = """
You are a Banking Assistant Chatbot.

Answer ONLY banking-related questions.

Allowed topics:
ATM PIN, ATM withdrawal, balance enquiry, transactions,
loan application, EMI, UPI PIN, debit card, customer care,
nearby bank branches, saving tips, fraud safety, account services,
internet banking, cheque book, FD account, money transfer.

Do not guess balance or transactions.
If user asks non-banking question reply exactly:
Sorry, I can answer only banking-related questions.

Keep answers short and simple.
"""

    try:
        response = ollama.chat(
            model="llama3",
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": message
                }
            ]
        )

        reply = response["message"]["content"]

    except Exception as e:
        reply = f"Ollama Error: {str(e)}"

    return jsonify({
        "reply": reply
    })


if __name__ == "__main__":
    app.run(debug=True)