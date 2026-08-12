"use client";

import {
  AppBar,
  Box,
  Button,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { DarkMode, LightMode } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useContext } from "react";
import { ViewModeContext } from "@/contexts/viewmode-context";

const Navbar = () => {
  const router = useRouter();
  const { settings, dispatch } = useContext(ViewModeContext);
  const nextMode = settings.viewMode === "dark" ? "light" : "dark";

  const toggleMode = () => {
    dispatch({ field: "viewMode", value: nextMode });
  };

  return (
    <AppBar
      position="fixed"
      color="default"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        borderBottom: 1,
        borderColor: "divider",
        backgroundColor: "background.paper",
        color: "text.primary",
      }}
    >
      <Toolbar sx={{ minHeight: "64px !important", px: 3, gap: 3 }}>
        <Typography
          variant="h6"
          component="button"
          // onClick={() => router.push("/classes")}
          sx={{
            p: 0,
            border: 0,
            background: "none",
            color: "inherit",
            fontFamily: "inherit",
            fontWeight: 700,
            letterSpacing: 0,
            // cursor: "pointer",
          }}
        >
          Knowledge Grapht
        </Typography>

        <Button
          color="inherit"
          onClick={() => router.push("/classes")}
          sx={{ letterSpacing: 0, textTransform: "none" }}
        >
          My Classes
        </Button>

        <Box sx={{ flex: 1 }} />

        <Button
          color="inherit"
          onClick={() => router.push("/about")}
          sx={{ letterSpacing: 0, textTransform: "none" }}
        >
          About
        </Button>

        <Button
          color="inherit"
          onClick={() => router.push("/auth/logout")}
          sx={{ letterSpacing: 0, textTransform: "none" }}
        >
          Log out
        </Button>
        <Tooltip title={`Switch to ${nextMode} mode`}>
          <IconButton
            color="inherit"
            onClick={toggleMode}
            aria-label={`Switch to ${nextMode} mode`}
          >
            {nextMode === "light" ? <LightMode /> : <DarkMode />}
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
