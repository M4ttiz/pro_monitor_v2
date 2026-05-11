import { io } from "socket.io-client";
import { apiBaseUrl } from "./apiClient";

export const socket = io(apiBaseUrl, {
  autoConnect: false
});
