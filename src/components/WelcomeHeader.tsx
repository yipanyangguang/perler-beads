/**
 * WelcomeHeader 组件
 * 页面顶部欢迎区域，包含 logo、标题和副标题
 */

import { FC } from "react";
import logo from "../assets/logo.svg";
import styles from "./Home.module.scss";

/**
 * WelcomeHeader 组件的 Props
 */
interface WelcomeHeaderProps {
  /** 是否为深色主题 */
  isDark: boolean;
}

/**
 * WelcomeHeader 组件
 */
const WelcomeHeader: FC<WelcomeHeaderProps> = () => {
  return (
    <div className={styles.welcome}>
      {/* Logo 区域 */}
      <div className={styles.logoWrapper}>
        <div className={styles.logoBg}>
          <img src={logo} alt="Logo" />
        </div>
      </div>

      {/* 标题 */}
      <h1 className={styles.title}>拼豆助手</h1>

      {/* 副标题 */}
      <p className={styles.subtitle}>轻松设计你的像素艺术</p>
    </div>
  );
};

export default WelcomeHeader;
