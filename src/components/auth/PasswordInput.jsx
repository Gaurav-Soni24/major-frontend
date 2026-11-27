"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Icon from "@/components/ui/Icon";
import styles from "./auth.module.css";

/**
 * Password input with a show/hide toggle (`aria-pressed`). Accepts all Input props.
 * @param {import("react").ComponentProps<typeof Input>} props
 */
export default function PasswordInput(props) {
  const [shown, setShown] = useState(false);
  return (
    <Input
      {...props}
      type={shown ? "text" : "password"}
      trailing={
        <button type="button" className={styles.toggle} aria-label={shown ? "Hide password" : "Show password"} aria-pressed={shown} onClick={() => setShown((v) => !v)}>
          <Icon name={shown ? "eye-off" : "eye"} size={18} />
        </button>
      }
    />
  );
}
