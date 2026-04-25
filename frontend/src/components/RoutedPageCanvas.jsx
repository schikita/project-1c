import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { DesignCanvas, DCArtboard, DCSection } from "./design/DesignCanvas";
import { getCanvasMeta } from "../routeCanvasMeta";

/**
 * Figma-style canvas shell for standard pages: one section, one scrollable artboard.
 */
export default function RoutedPageCanvas({ children }) {
  const { pathname } = useLocation();
  const meta = useMemo(() => getCanvasMeta(pathname), [pathname]);
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));

  const cardWidth = isXs ? "min(100vw - 24px, 720px)" : "min(calc(100vw - 96px), min(1180px, 100%))";
  const cardHeight = isMdDown ? "min(88dvh, 2200px)" : "min(78dvh, 2200px)";

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <DesignCanvas minScale={0.08} maxScale={4} style={{ flex: 1, minHeight: 0 }}>
        <DCSection id={meta.sectionId} title={meta.title} subtitle={meta.subtitle} gap={isXs ? 16 : 40}>
          <DCArtboard id="main" label={meta.label} width={cardWidth} height={cardHeight} scrollable>
            <Box
              className="dc-page-inner"
              sx={{
                p: { xs: 1, sm: 1.5, md: 2 },
                boxSizing: "border-box",
                maxWidth: "100%",
                "& img, & video": { maxWidth: "100%", height: "auto" },
                "& .MuiTableContainer-root": { overflowX: "auto", maxWidth: "100%" },
                "& table": { minWidth: isXs ? 480 : 0 },
              }}
            >
              {children}
            </Box>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>
    </Box>
  );
}
