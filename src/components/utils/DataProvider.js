import React, { useState } from "react";

const DataContext = React.createContext();

const DataProvider = props => {
  const [disabled, setDisabled] = useState(true);
  const [colorClass, setColorClass] = useState(null);
  const [page, setPage] = useState("home");
  const [worker, setWorker] = useState(null);

  return (
    <DataContext.Provider
      value={{
        disabled,
        setDisabled,
        colorClass,
        setColorClass,
        page,
        setPage,
        worker,
        setWorker
      }}
    >
      {props.children}
    </DataContext.Provider>
  );
};

const DataConsumer = DataContext.Consumer;

export { DataConsumer };
export { DataContext };
export default DataProvider;
