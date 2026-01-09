/**
 * useProjectCreation Hook
 * Home 页面特定：处理项目创建相关的逻辑
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "@/store/useProjectStore";

export const useProjectCreation = () => {
  const navigate = useNavigate();
  const createProject = useProjectStore((state) => state.createProject);

  // 项目创建表单状态
  const [width, setWidth] = useState(50);
  const [height, setHeight] = useState(50);
  const [name, setName] = useState("我的拼豆项目");

  // 模态框显示状态
  const [isModalOpen, setIsModalOpen] = useState(false);

  /**
   * 处理项目创建
   * 创建项目并跳转到编辑页面
   */
  const handleCreate = () => {
    createProject(width, height, name);
    navigate("/editor");
  };

  /**
   * 打开创建项目模态框
   */
  const openModal = () => {
    setIsModalOpen(true);
  };

  /**
   * 关闭创建项目模态框
   */
  const closeModal = () => {
    setIsModalOpen(false);
  };

  /**
   * 重置表单数据
   */
  const resetForm = () => {
    setWidth(50);
    setHeight(50);
    setName("我的拼豆项目");
  };

  return {
    // 表单状态
    width,
    setWidth,
    height,
    setHeight,
    name,
    setName,
    // 模态框状态
    isModalOpen,
    openModal,
    closeModal,
    // 处理函数
    handleCreate,
    resetForm,
  };
};
