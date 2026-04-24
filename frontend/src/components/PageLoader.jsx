import React from "react";
import { CircularProgress, Stack, Typography } from "@mui/material";

export default function PageLoader({ text = "Загрузка..." }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
      <CircularProgress size={18} />
      <Typography variant="body2">{text}</Typography>
    </Stack>
  );
}
