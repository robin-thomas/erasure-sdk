import React from "react";

import Home from "../home";

const getComponent = page => {
  switch (page) {
    case "home":
    default:
      return <Home />;
  }
};

export default getComponent;
