"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const types_1 = require("./types");
const handler = async (event) => {
    const apiKey = process.env.UPTIME_ROBOT_API_KEY;
    if (!apiKey) {
        return (0, types_1.addCorsHeaders)((0, types_1.createSuccessResponse)({
            status: "unknown",
            label: "Status Unknown"
        }));
    }
    try {
        // Uptime Robot API v2
        const params = new URLSearchParams({
            api_key: apiKey,
            format: "json",
            statuses: "2-8-9" // Only get up, seems down, or down statuses
        });
        // Only add monitors parameter if a specific monitor ID is provided
        if (event.queryStringParameters?.monitorId) {
            params.append("monitors", event.queryStringParameters.monitorId);
        }
        const response = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Cache-Control": "no-cache"
            },
            body: params.toString()
        });
        const data = (await response.json());
        // Log the response for debugging (remove in production if needed)
        console.log("Uptime Robot API response:", JSON.stringify(data));
        if (data.stat === "ok" && data.monitors && data.monitors.length > 0) {
            // Get the first monitor (or filter by ID if provided)
            const monitor = event.queryStringParameters?.monitorId
                ? data.monitors.find((m) => m.id === event.queryStringParameters?.monitorId)
                : data.monitors[0];
            if (!monitor) {
                return (0, types_1.addCorsHeaders)((0, types_1.createSuccessResponse)({
                    status: "unknown",
                    label: "Monitor Not Found"
                }));
            }
            // Status codes: 0=paused, 1=not checked, 2=up, 8=seems down, 9=down
            let status;
            let label;
            let color;
            if (monitor.status === 2) {
                status = "up";
                label = "All Systems Operational";
                color = "green";
            }
            else if (monitor.status === 8) {
                status = "warning";
                label = "Possible Issues";
                color = "yellow";
            }
            else if (monitor.status === 9) {
                status = "down";
                label = "Service Down";
                color = "red";
            }
            else {
                status = "unknown";
                label = "Status Unknown";
                color = "gray";
            }
            return (0, types_1.addCorsHeaders)((0, types_1.createSuccessResponse)({
                status,
                label,
                color,
                uptime: monitor.all_time_uptime_ratio || null,
                responseTime: monitor.average_response_time || null
            }, 200, {
                "Cache-Control": "public, max-age=60" // Cache for 1 minute
            }));
        }
        else {
            // Log the error for debugging
            console.error("Uptime Robot API error:", {
                stat: data.stat,
                message: data.message,
                error: data.error,
                fullResponse: JSON.stringify(data)
            });
            return (0, types_1.addCorsHeaders)((0, types_1.createSuccessResponse)({
                status: "unknown",
                label: "Unable to Fetch Status",
                error: data.error?.message || data.message || "Unknown error",
                ...(process.env.NODE_ENV === "development" && { debug: data })
            }));
        }
    }
    catch (error) {
        console.error("Error fetching Uptime Robot status:", error);
        console.error("Error details:", {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : undefined
        });
        return (0, types_1.addCorsHeaders)((0, types_1.createSuccessResponse)({
            status: "unknown",
            label: "Status Check Failed",
            error: error instanceof Error ? error.message : String(error)
        }));
    }
};
exports.handler = handler;
