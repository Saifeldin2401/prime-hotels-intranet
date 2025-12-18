import { useLottie } from "lottie-react";
import { cn } from "@/lib/utils";

interface AnimatedStateProps {
    animationData: any;
    className?: string;
    loop?: boolean;
    autoplay?: boolean;
    height?: number | string;
    width?: number | string;
}

export function AnimatedState({
    animationData,
    className,
    loop = true,
    autoplay = true,
    height = 200,
    width = 200
}: AnimatedStateProps) {
    const options = {
        animationData,
        loop,
        autoplay,
    };

    const style = {
        height: height,
        width: width,
    };

    const { View } = useLottie(options, style);

    return (
        <div className={cn("flex justify-center items-center", className)}>
            {View}
        </div>
    );
}
