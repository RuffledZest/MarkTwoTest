"use client";

import { ArrowRight } from "lucide-react";
import React, { useEffect, useState } from "react";
import ThreeD from "./ThreeD";
import { useRouter } from "next/navigation";
import { getWalletAddress } from "@/app/utils/arweaveUtils";
import { toast } from "sonner";

const Hero = () => {
  const router = useRouter();
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        const address = await getWalletAddress();
        setIsWalletConnected(!!address);
      } catch (error) {
        setIsWalletConnected(false);
      }
    };

    checkWalletConnection();
    window.addEventListener("wallet-connected", checkWalletConnection);
    window.addEventListener("wallet-disconnected", checkWalletConnection);

    return () => {
      window.removeEventListener("wallet-connected", checkWalletConnection);
      window.removeEventListener("wallet-disconnected", checkWalletConnection);
    };
  }, []);

  const handleGetStarted = async () => {
    if (!isWalletConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
    router.push("/dashboard");
  };

  return (
    <section className="relative bg-black text-white h-screen overflow-hidden">
      {/* 3D Background Element */}
      <ThreeD />

      {/* Content Layer */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full max-w-3xl text-center px-4">
        <h1 className="t p-2 text-3xl font-extrabold text-transparent sm:text-7xl">
          CANVAS AND WIREFRAMING
        </h1>
        <p className="sm:block text-8xl font-bold">
          {" "}
          COLLABORATE AND CREATE{" "}
        </p>

        <p className="mx-auto mt-4 max-w-xl sm:text-base/relaxed">
          All-in-one markdown editor, collaborative canvas, and
          diagram-as-code builder
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button
            onClick={handleGetStarted}
            className={`flex items-center w-full rounded-lg border border-white px-4 py-2 text-sm font-medium transition ${
              isWalletConnected
                ? "bg-neutral-100 text-black hover:bg-neutral-300"
                : "bg-transparent text-white opacity-50 cursor-not-allowed"
            }`}
          >
            Get Started
            <p className="ml-2">
              <ArrowRight size={24} />
            </p>
          </button>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-[20%] bg-gradient-to-t from-black to-transparent z-10"></div>
      {/* also make a left and a right side of the screen */}
      <div className="absolute top-0 left-0 w-[20%] h-full bg-gradient-to-r from-black to-transparent z-10"></div>
      <div className="absolute top-0 right-0 w-[20%] h-full bg-gradient-to-l from-black to-transparent z-10"></div>
    </section>
  );
};

export default Hero;
