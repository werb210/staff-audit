import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { isAuthed } from "../lib/auth";
import Login from "./Login";
import StaffPortal from "./staff/StaffPortal";
import DialerPro from "../components/DialerPro";

export default function Portal() {
  if (!isAuthed()) {
    return <Login />;
  }

  return (
    <>
      <Routes>
        <Route path="/staff/*" element={<StaffPortal />} />
        <Route path="*" element={<Navigate to="/staff" replace />} />
      </Routes>
      <DialerPro />
    </>
  );
}