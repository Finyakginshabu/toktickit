import "@testing-library/jest-dom";
import { beforeEach } from "vitest";

beforeEach(() => {
  localStorage.setItem("toktickit_auth_token", "mock-valid-token");
  localStorage.setItem(
    "toktickit_auth_user",
    JSON.stringify({
      id: 1,
      name: "Jennifer Anderson",
      email: "jennifer.anderson@kmutt.ac.th",
      role: "REQUESTER",
      mustChangePassword: false,
      department: "Computer Engineering",
    })
  );
});
