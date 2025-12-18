import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useEffect, useRef } from "react";

export interface TourStep {
    element: string;
    popover: {
        title: string;
        description: string;
        side?: "left" | "right" | "top" | "bottom";
        align?: "start" | "center" | "end";
    };
}

export function useTour(steps: TourStep[]) {
    const driverObj = useRef<any>(null);

    useEffect(() => {
        driverObj.current = driver({
            showProgress: true,
            steps: steps,
            animate: true,
            smoothScroll: true,
            allowClose: true,
            stagePadding: 5,
        });
    }, [steps]);

    const startTour = () => {
        if (driverObj.current) {
            driverObj.current.drive();
        }
    };

    return { startTour };
}
