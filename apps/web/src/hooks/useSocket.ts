import { useEffect } from "react";
import { socket } from "../lib/socketClient";
import { useAlertsStore } from "../stores/useAlertsStore";
import { useMetricsStore } from "../stores/useMetricsStore";

export const useSocket = (accessToken: string | null): void => {
  const pushMetric = useMetricsStore((state) => state.pushMetric);
  const pushAlert = useAlertsStore((state) => state.pushAlert);

  useEffect(() => {
    if (!accessToken) {
      socket.disconnect();
      return;
    }

    socket.auth = { token: accessToken };
    socket.connect();
    socket.on("metric:new", pushMetric);
    socket.on("alert:new", pushAlert);

    return () => {
      socket.off("metric:new", pushMetric);
      socket.off("alert:new", pushAlert);
      socket.disconnect();
    };
  }, [accessToken, pushMetric, pushAlert]);
};
