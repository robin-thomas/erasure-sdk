import React, { useContext, useEffect } from "react";

import { Container } from "react-bootstrap";

import Worker from "./app.worker.js";
import getComponent from "./Component";
import { DataContext } from "../utils/DataProvider";

import "./App.css";

const App = ({ colorClass }) => {
  const ctx = useContext(DataContext);

  // Initialize the web worker for processing.
  useEffect(() => {
    const worker = new Worker();
    worker.onmessage = e => {};
    ctx.setWorker(worker);
  }, []);

  // Update the theme when required.
  useEffect(() => {
    ctx.setColorClass(colorClass);

    document.documentElement.style.setProperty(
      "--erasure-color",
      `var(--erasure-color-${colorClass})`
    );
  }, [ctx.setColorClass, colorClass]);

  return (
    <Container fluid={true} className="erasure-container">
      {getComponent(ctx.page)}
    </Container>
  );
};

export default App;
