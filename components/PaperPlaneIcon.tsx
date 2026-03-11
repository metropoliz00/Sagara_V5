import React from 'react';

interface PaperPlaneIconProps {
  size?: number;
  className?: string;
  color?: string;
}

const PaperPlaneIcon: React.FC<PaperPlaneIconProps> = ({ size = 20, className = "", color = "currentColor" }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path 
        d="M21.4359 2.58198C20.9359 2.06198 20.1959 1.87198 19.5059 2.07198L2.25586 7.11198C1.55586 7.31198 1.05586 7.87198 0.995859 8.60198C0.935859 9.33198 1.32586 10.022 1.97586 10.362L6.25586 12.502L18.0059 5.00198L9.00586 13.502V18.502C9.00586 19.102 9.33586 19.652 9.87586 19.922C10.4159 20.192 11.0559 20.142 11.5459 19.792L14.7559 17.502L18.7559 20.502C19.2559 20.882 19.9259 20.932 20.4759 20.632C21.0259 20.332 21.3659 19.742 21.3459 19.112L21.9959 4.11198C22.0259 3.53198 21.8159 2.97198 21.4359 2.58198Z" 
        fill={color}
      />
    </svg>
  );
};

export default PaperPlaneIcon;
