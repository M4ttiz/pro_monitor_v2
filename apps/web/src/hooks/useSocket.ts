import { useEffect } from "react";
import { socket } from "../lib/socketClient";
import { useMetricsStore } from "../stores/useMetricsStore";

export const useSocket = (accessToken: string | null): void => {
  const pushMetric = useMetricsStore((state) => state.pushMetric);

  useEffect(() => {
    if (!accessToken) {
      socket.disconnect();
      return;
    }

    socket.auth = { token: accessToken };
    socket.connect();
    socket.on("metric:new", pushMetric);

    return () => {
      socket.off("metric:new", pushMetric);
      socket.disconnect();
    };
  }, [accessToken, pushMetric]);
};
