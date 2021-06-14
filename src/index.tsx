import React from 'react';
import ReactDOM from 'react-dom';
import { createMuiTheme, CssBaseline, Slide, ThemeProvider } from '@material-ui/core';
import { SnackbarProvider } from 'notistack';
import DbCtx from './db.ctx';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';
import 'dexie-observable';

const theme = createMuiTheme()

// prevent async db connect
const AppWrapper = () => {
  const { db } = DbCtx.useContainer();

  if (db?.isOpen()) {
    return <App />
  } else {
    return (
      <div />
    )
  }
}

ReactDOM.render(
  // <React.StrictMode> TODO: uncomment when notistack fix the error log
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <DbCtx.Provider>
      <SnackbarProvider
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        style={{ width: 300 }}
        autoHideDuration={3000}
        maxSnack={3}
        // @ts-ignore TODO: remove when TransitionComponent is not error
        TransitionComponent={Slide}
      >
        <AppWrapper />
      </SnackbarProvider>
    </DbCtx.Provider>
  </ThemeProvider>,
  // </React.StrictMode>
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
