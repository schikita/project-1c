import React from "react";
import { Alert } from "@mui/material";

export default function PageError({ message }) {
  if (!message) return null;
  return <Alert severity="error" sx={{ mt: 1 }}>{message}</Alert>;
}
