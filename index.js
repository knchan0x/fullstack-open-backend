require("dotenv").config();

const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const Person = require("./models/person");

morgan.token("body", function (request) {
  return JSON.stringify(request.body);
});

const app = express();

app.use(express.static("dist"));
app.use(express.json());
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms :body")
);
app.use(cors());

app.get("/info", (response) => {
  Person.find({}).then((persons) => {
    response.send(
      `<p>phonebook has info for ${persons.length} people</p><p>${new Date(
        Date.now()
      ).toString()}</p>`
    );
  });
});

app.get("/api/persons", (response) => {
  Person.find({}).then((persons) => {
    response.json(persons);
    // FIXME: close connection
    // mongoose.connection.close();
  });
});

app.get("/api/persons/:id", (request, response, next) => {
  Person.findById(request.params.id)
    .then((person) => {
      if (person) {
        response.json(person);
      } else {
        response.status(404).end();
      }
    })
    .catch((error) => next(error));
});

app.delete("/api/persons/:id", (request, response, next) => {
  Person.findByIdAndRemove(request.params.id)
    .then(() => {
      response.status(204).end();
    })
    .catch((error) => next(error));
});

app.post("/api/persons", (request, response, next) => {
  const body = request.body;

  Person.find({ name: body.name }).then((persons) => {
    if (persons.length === 1) {
      return response.json({ error: "name must be unique" });
    } else {
      const person = new Person(body);

      person
        .save()
        .then((saved) => {
          response.json(saved);
        })
        .catch((error) => next(error));
    }
  });
});

app.put("/api/persons/:id", (request, response, next) => {
  const { name, number } = request.body;

  Person.findByIdAndUpdate(
    request.params.id,
    { name, number },
    { returnDocument: "after", runValidators: true, context: "query" }
  )
    .then((updated) => {
      response.json(updated);
    })
    .catch((error) => next(error));
});

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: "unknown endpoint" });
};

// handler of requests with unknown endpoint
app.use(unknownEndpoint);

const errorHandler = (error, request, response, next) => {
  console.error(error.message);

  if (error.name === "CastError") {
    return response.status(400).send({ error: "incorrect id" });
  } else if (error.name === "ValidationError") {
    return response.status(400).json({ error: error.message });
  }

  next(error);
};

// this has to be the last loaded middleware.
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
