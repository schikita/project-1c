import React from "react";
import { Card, CardContent, Typography } from "@mui/material";

export default function SectionCard({ title, children }) {
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1.5 }}>{title}</Typography>
        {children}
      </CardContent>
    </Card>
  );
}
