const express = require("express");
const path = require("path");
const app = express();
const admin = require('firebase-admin'); // Importing the Firebase Admin SDK
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

var serviceAccount = require("./firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount) // Initialize the app with your service account
});

const db = admin.firestore(); // Initialize Firestore

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get("/", (req, res) => {
    res.render("login_signup1");
});

app.post("/signupsubmit", async (req, res) => {
    const { signupName, mail, passcode } = req.body;

    try {
        const userSnapshot = await db.collection('database').where('mail', '==', mail).get();

        if (!userSnapshot.empty) {
            return res.status(400).send("Email already exists");
        }

        const hashedPassword = await bcrypt.hash(passcode, 10);

        await db.collection('database').add({ signupName, mail, passcode: hashedPassword });
        res.redirect('/');
    } catch (error) {
        res.status(500).send("Error signing up: " + error.message);
    }
});

app.post("/loginsubmit", async (req, res) => {
    const { mail, passcode } = req.body;

    try {
        const userSnapshot = await db.collection('database').where('mail', '==', mail).get();

        if (userSnapshot.empty) {
            return res.status(400).send("Invalid email or password");
        }

        let userFound = false;
        let userName = '';

        for (const doc of userSnapshot.docs) {
            const user = doc.data();
            const match = await bcrypt.compare(passcode, user.passcode);
            if (match) {
                userFound = true;
                userName = user.signupName;
                break;
            }
        }

        if (userFound) {
            console.log("User Name:", userName);
            return res.render('dashboard', { userName });
        } else {
            res.status(400).send("Invalid email or password");
        }
    } catch (error) {
        res.status(500).send("Error logging in: " + error.message);
    }
});

app.get('/option1', (req, res) => {
  res.render('VIT');
});

app.get('/Happenings', async (req, res) => {
  try {
      const postsSnapshot = await db.collection('posts').orderBy('createdAt', 'desc').get();
      const posts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.render('Happenings', { posts });
  } catch (error) {
      res.status(500).send("Error loading posts: " + error.message);
  }
});


app.post('/add', async (req, res) => {
    const { title, content } = req.body;
    try {
        await db.collection('posts').add({
            title,
            content,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        res.redirect('/Happenings');
    } catch (error) {
        res.status(500).send("Error adding post: " + error.message);
    }
});

app.get('/Events', async (req, res) => {
  try {
      const eventsSnapshot = await db.collection('events').orderBy('createdAt', 'desc').get();
      const events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.render('Events', { events });
  } catch (error) {
      res.status(500).send("Error loading events: " + error.message);
  }
});

app.post('/addEvent', async (req, res) => {
  const { title, content } = req.body;
  try {
      await db.collection('events').add({
          title,
          content,
          createdAt: new Date() // Use JavaScript's Date object for simplicity
      });
      res.redirect('/Events'); // Redirect back to Events page after adding the event
  } catch (error) {
      res.status(500).send("Error adding event: " + error.message);
  }
});


app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
