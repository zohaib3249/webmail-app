# 📬 WebMail Multi-Mailbox Client

A full-featured open-source **webmail application** built with **Django** (REST API backend) and **React + Vite** (frontend). Designed to allow users to manage **multiple mailboxes** using **alias-based access**, offering a seamless experience like Gmail — including **sending**, **receiving**, **replying**, and **forwarding** emails.

---

## ✨ Features

- 🔐 User login & mailbox alias system
- 📥 Inbox & sent mail views (with threading support)
- 📨 Compose, reply, reply-all, forward
- 📎 Attachment support
- 🔔 Spam detection & deletion
- 📂 Mailbox management by alias (each alias works as a separate user)
- ⏱ Periodic email syncing with **IMAP**
- 📩 Inline email viewer with HTML & text fallback
- 💬 Rich text editor for replies & forwards
- ☁️ Gmail & third-party provider support (✅ planned)

---

## 🧠 How It Works

- Each **email alias** is treated as a virtual mailbox.
- Aliases can send/receive mail independently.
- Emails are fetched via IMAP and stored in the backend.
- Frontend interacts through a secure REST API.

---

## 🔧 Tech Stack

| Layer     | Tech Stack                     |
|-----------|--------------------------------|
| Backend   | Django, Django REST Framework, Celery, PostgreSQL |
| Frontend  | React (Vite), TypeScript       |
| Mail Sync | IMAP via `imaplib`             |
| Scheduler | Celery + django-celery-beat    |
| Auth      | JWT-based (SimpleJWT)          |

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/zohaib3249/webmail-app
cd webmail-app
````

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate

pip install -r requirements.txt

cp .env.example .env  # Update DB and email settings here

# Setup DB
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run server
python manage.py runserver
```

#### 🌱 Optional: Start Celery & Beat

```bash
celery -A backend worker --loglevel=info
celery -A backend beat --loglevel=info
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## 📅 Email Syncing

* Emails are synced every 5 minutes via Celery Beat.
* You can customize this in `celery.py` or via Django Admin.

---

## 📌 TODOs / Roadmap

* [ ] Gmail OAuth2 integration
* [ ] Support for Outlook/Yahoo providers
* [ ] Tag/label management
* [ ] Mobile-friendly UI

---

## 🛡 Security Notes

* Uses secure IMAP connections.
* JWT tokens are stored in `localStorage` — ensure HTTPS is used in production.

---

## 📄 License

This project is [MIT licensed](LICENSE).

---

## 👨‍💻 Contributing

Pull requests are welcome! For major changes, open an issue first to discuss what you’d like to change. Please make sure to update tests as appropriate.

---

## 🙏 Credits

Built with ❤️ by Zohaib Yousaf
Special thanks to Django, React, and the open-source community.

