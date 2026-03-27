/**
 * SceneErrorBoundary — catches WebGL / Three.js crashes and shows a fallback.
 */

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class SceneErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="max-w-sm px-6 text-center">
            <AlertTriangle className="mx-auto mb-3 size-8 text-destructive" />
            <div className="text-sm font-medium text-foreground">3D 场景加载失败</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {this.state.message || "WebGL 可能不可用，请尝试更新浏览器或启用硬件加速。"}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 h-8 text-xs"
              onClick={() => this.setState({ hasError: false, message: "" })}
            >
              重试
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
