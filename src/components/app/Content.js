/*global confirm*/
/*eslint no-restricted-globals: ["off", "confirm"]*/

import React, { useContext } from "react";

import { MDBIcon } from "mdbreact";
import { Container, Row, Col } from "react-bootstrap";

import { DataContext } from "../utils/DataProvider";

import "./Content.css";

const Content = ({ header, children }) => {
  const ctx = useContext(DataContext);

  const reset = () => {
    ctx.setDisabled(true);
    ctx.setPage("home");
  };

  const logout = () => {
    if (ctx.page === "login") {
      reset(ctx);
    } else if (confirm("Are you sure you want to logout?")) {
      reset(ctx);
    }
  };

  return (
    <Container className="erasure-content">
      <Row>
        <Col xs="9" md="9" className="px-0 erasure-content-header">
          {header}
        </Col>
        <Col xs="3" md="3">
          {ctx.page !== "home" ? (
            <MDBIcon
              icon="times"
              className="erasure-content-close"
              onClick={logout}
            />
          ) : (
            ""
          )}
        </Col>
      </Row>
      <div className="erasure-content-footer">{children}</div>
    </Container>
  );
};

export default Content;
